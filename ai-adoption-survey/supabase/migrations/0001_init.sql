-- =============================================================
-- AI活用レベル診断 初期スキーマ
-- =============================================================
create extension if not exists pgcrypto;

-- ---------- テーブル ----------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  employee_size_band text not null,
  expected_respondents int,
  created_at timestamptz not null default now()
);

create table public.company_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- デジライズ管理者
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  unique (company_id, name)
);

create table public.survey_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in
    ('literacy','usage','org_drive','culture','mindset','governance')),
  text text not null,
  scale_type text not null default 'agreement' check (scale_type in ('agreement','frequency')),
  is_reversed boolean not null default false,
  sort_order int not null,
  version int not null default 1,
  is_active boolean not null default true
);

-- 回答: 個人特定情報カラムを持たない
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  role_band text check (role_band in ('executive','manager','staff')),
  age_band text check (age_band in ('u20s','30s','40s','50s','o60s')),
  question_version int not null default 1,
  answers jsonb not null,
  free_text text,
  category_scores jsonb not null,
  total_score numeric not null,
  created_at timestamptz not null default now()
);
create index responses_company_idx on public.responses (company_id);
create index responses_department_idx on public.responses (department_id);

create table public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  industry text not null default 'all',
  size_band text not null default 'all',
  mean numeric not null,
  sd numeric not null,
  n int not null,
  source text not null check (source in ('seed','actual')),
  updated_at timestamptz not null default now(),
  unique (category, industry, size_band)
);

create table public.scoring_config (
  id int primary key default 1 check (id = 1),
  weights jsonb not null default
    '{"literacy":1,"usage":1,"org_drive":1,"culture":1,"mindset":1,"governance":1}',
  level_thresholds jsonb not null default '[20,40,60,80]',
  min_responses_per_dept int not null default 3,
  benchmark_switch_threshold int not null default 30,
  updated_at timestamptz not null default now()
);

-- ---------- ヘルパー関数 ----------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admin_users where user_id = auth.uid()); $$;

create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path = public as
$$ select company_id from company_admins where user_id = auth.uid(); $$;

-- ---------- RLS ----------

alter table public.companies enable row level security;
alter table public.company_admins enable row level security;
alter table public.admin_users enable row level security;
alter table public.departments enable row level security;
alter table public.survey_links enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;
alter table public.benchmarks enable row level security;
alter table public.scoring_config enable row level security;

-- companies: 自社 or 管理者のみ参照。作成は登録API(service role)のみ
create policy companies_select on public.companies for select
  using (id = my_company_id() or is_admin());
create policy companies_update on public.companies for update
  using (id = my_company_id() or is_admin());

-- company_admins: 本人 or 管理者
create policy company_admins_select on public.company_admins for select
  using (user_id = auth.uid() or is_admin());

-- admin_users: 管理者のみ
create policy admin_users_select on public.admin_users for select
  using (user_id = auth.uid());

-- departments: 自社のものは管理可、管理者は全件参照
create policy departments_select on public.departments for select
  using (company_id = my_company_id() or is_admin());
create policy departments_insert on public.departments for insert
  with check (company_id = my_company_id());
create policy departments_update on public.departments for update
  using (company_id = my_company_id());
create policy departments_delete on public.departments for delete
  using (company_id = my_company_id());

-- survey_links: 自社 or 管理者。発行は登録API(service role)
create policy survey_links_select on public.survey_links for select
  using (company_id = my_company_id() or is_admin());
create policy survey_links_update on public.survey_links for update
  using (company_id = my_company_id() or is_admin());

-- questions: 誰でも参照可(回答画面はAPI経由だが念のため有効な設問のみ)
create policy questions_select on public.questions for select
  using (is_active or is_admin());
create policy questions_admin_write on public.questions for all
  using (is_admin()) with check (is_admin());

-- responses: 生データは管理者のみ。担当者は集計RPC経由でのみ取得
create policy responses_admin_select on public.responses for select
  using (is_admin());
-- INSERTポリシーなし = 回答POSTはservice role(トークン検証付きRoute Handler)のみ

-- benchmarks / scoring_config: ログインユーザーは参照可、書込は管理者
create policy benchmarks_select on public.benchmarks for select
  to authenticated using (true);
create policy benchmarks_admin_write on public.benchmarks for all
  using (is_admin()) with check (is_admin());
create policy scoring_config_select on public.scoring_config for select
  to authenticated using (true);
create policy scoring_config_admin_write on public.scoring_config for update
  using (is_admin()) with check (is_admin());

-- ---------- 集計RPC(担当者にはこの経由でのみ回答データを提供) ----------

create or replace function public.get_company_dashboard(p_company_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as
$$
declare
  v_min int;
  v_overall jsonb;
  v_total numeric;
  v_n int;
  v_departments jsonb;
  v_free_texts jsonb;
begin
  -- 注意: my_company_id()がNULL(部外者)の場合に判定がNULLにならないようcoalesceで明示的にfalse化する
  if not (is_admin() or coalesce(my_company_id() = p_company_id, false)) then
    raise exception 'permission denied';
  end if;

  select min_responses_per_dept into v_min from scoring_config where id = 1;
  v_min := coalesce(v_min, 3);

  select count(*), round(avg(total_score), 1)
    into v_n, v_total
    from responses where company_id = p_company_id;

  select jsonb_object_agg(k, v) into v_overall
    from (
      select key as k, round(avg(value::numeric), 1) as v
      from responses r, jsonb_each_text(r.category_scores)
      where r.company_id = p_company_id
      group by key
    ) s;

  select coalesce(jsonb_agg(d order by (d->>'sort_order')::int, d->>'name'), '[]') into v_departments
    from (
      select jsonb_build_object(
        'id', dep.id,
        'name', dep.name,
        'sort_order', dep.sort_order,
        'n', coalesce(cnt.n, 0),
        'sufficient', coalesce(cnt.n, 0) >= v_min,
        'total_score', case when coalesce(cnt.n, 0) >= v_min then cnt.avg_total end,
        'category_scores', case when coalesce(cnt.n, 0) >= v_min then cat.scores end
      ) as d
      from departments dep
      left join (
        select department_id, count(*) n, round(avg(total_score), 1) avg_total
        from responses where company_id = p_company_id group by department_id
      ) cnt on cnt.department_id = dep.id
      left join (
        select department_id, jsonb_object_agg(k, v) scores
        from (
          select r.department_id, key k, round(avg(value::numeric), 1) v
          from responses r, jsonb_each_text(r.category_scores)
          where r.company_id = p_company_id
          group by r.department_id, key
        ) x group by department_id
      ) cat on cat.department_id = dep.id
      where dep.company_id = p_company_id
    ) deps;

  select coalesce(jsonb_agg(jsonb_build_object(
           'department', dep_name, 'text', free_text, 'created_at', created_at)
           order by created_at desc), '[]')
    into v_free_texts
    from (
      select d.name dep_name, r.free_text, r.created_at
      from responses r join departments d on d.id = r.department_id
      where r.company_id = p_company_id
        and r.free_text is not null and length(trim(r.free_text)) > 0
      order by r.created_at desc limit 100
    ) ft;

  return jsonb_build_object(
    'n', coalesce(v_n, 0),
    'total_score', v_total,
    'category_scores', v_overall,
    'departments', v_departments,
    'free_texts', v_free_texts,
    'min_responses_per_dept', v_min
  );
end;
$$;

-- 管理画面: 企業一覧(リード情報+回答状況)
create or replace function public.get_companies_overview()
returns jsonb
language plpgsql stable security definer set search_path = public as
$$
declare v jsonb;
begin
  if not is_admin() then
    raise exception 'permission denied';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'industry', c.industry,
      'employee_size_band', c.employee_size_band,
      'expected_respondents', c.expected_respondents,
      'created_at', c.created_at,
      'admin_name', a.name, 'admin_email', a.email, 'admin_phone', a.phone,
      'response_count', coalesce(r.n, 0),
      'avg_total_score', r.avg_total
    ) order by c.created_at desc), '[]') into v
  from companies c
  left join company_admins a on a.company_id = c.id
  left join (
    select company_id, count(*) n, round(avg(total_score), 1) avg_total
    from responses group by company_id
  ) r on r.company_id = c.id;
  return v;
end;
$$;

-- ---------- ベンチマーク自動切替 ----------
-- 実回答企業数が閾値を超えたら、企業単位の平均スコアから mean/sd を再計算して
-- source='actual' に切替える。閾値未満なら何もしない(seed値を維持)。
create or replace function public.refresh_benchmarks()
returns jsonb
language plpgsql security definer set search_path = public as
$$
declare
  v_threshold int;
  v_companies int;
  v_updated int := 0;
begin
  select benchmark_switch_threshold into v_threshold from scoring_config where id = 1;
  select count(distinct company_id) into v_companies from responses;

  if v_companies < coalesce(v_threshold, 30) then
    return jsonb_build_object('switched', false, 'companies', v_companies,
                              'threshold', v_threshold);
  end if;

  -- 企業単位の平均スコア(カテゴリー別 + total)を母集団とする
  with company_scores as (
    select r.company_id, c.industry, c.employee_size_band as size_band,
           s.key as category, avg(s.value::numeric) as score
    from responses r
    join companies c on c.id = r.company_id,
    jsonb_each_text(r.category_scores) s
    group by r.company_id, c.industry, c.employee_size_band, s.key
    union all
    select r.company_id, c.industry, c.employee_size_band, 'total', avg(r.total_score)
    from responses r join companies c on c.id = r.company_id
    group by r.company_id, c.industry, c.employee_size_band
  ),
  stats as (
    -- 全国
    select category, 'all'::text industry, 'all'::text size_band,
           avg(score) mean, stddev_samp(score) sd, count(*) n
    from company_scores group by category
    union all
    -- 業種別
    select category, industry, 'all', avg(score), stddev_samp(score), count(*)
    from company_scores group by category, industry
    union all
    -- 規模別
    select category, 'all', size_band, avg(score), stddev_samp(score), count(*)
    from company_scores group by category, size_band
    union all
    -- 業種×規模
    select category, industry, size_band, avg(score), stddev_samp(score), count(*)
    from company_scores group by category, industry, size_band
  ),
  upserted as (
    insert into benchmarks (category, industry, size_band, mean, sd, n, source, updated_at)
    select category, industry, size_band, round(mean, 2), round(sd, 2), n, 'actual', now()
    from stats
    where n >= 5 and sd is not null and sd > 0   -- 母数が小さすぎるセグメントは更新しない
    on conflict (category, industry, size_band) do update
      set mean = excluded.mean, sd = excluded.sd, n = excluded.n,
          source = 'actual', updated_at = now()
    returning 1
  )
  select count(*) into v_updated from upserted;

  return jsonb_build_object('switched', true, 'companies', v_companies,
                            'updated_rows', v_updated);
end;
$$;

-- RPCの実行権限: refresh_benchmarksはサーバー(service role/cron)専用
revoke execute on function public.refresh_benchmarks() from public, anon, authenticated;
