-- =============================================================
-- Seedデータ: スコアリング設定 / 設問27問 / 初期ベンチマーク /
--             ローカル開発用ユーザー / デモ企業 + ダミー回答50件
-- 注意: auth.users への直接INSERTはローカル開発専用。
--       本番では管理者ユーザーをSupabaseダッシュボードで作成し
--       admin_users にuser_idを登録すること(README参照)。
-- =============================================================

insert into scoring_config (id) values (1) on conflict do nothing;

-- ---------- 設問27問 ----------
insert into questions (category, text, scale_type, is_reversed, sort_order, version) values
-- 1. AIリテラシー
('literacy', '生成AI(ChatGPTなど)がどのような仕組みで回答を作っているか、概要を人に説明できる', 'agreement', false, 1, 1),
('literacy', '目的に応じて複数のAIツール(文章生成・画像生成・検索型など)を使い分けられる', 'agreement', false, 2, 1),
('literacy', '欲しい回答を得るために、AIへの指示文(プロンプト)を自分なりに工夫して書ける', 'agreement', false, 3, 1),
('literacy', 'AIの回答には誤りが含まれる可能性があることを理解し、重要な内容は自分で確認・検証している', 'agreement', false, 4, 1),
('literacy', 'AIの新しいツールや機能に関する情報を、自分から進んで収集している', 'agreement', false, 5, 1),
-- 2. 業務活用度
('usage', '業務でAI(生成AIツール)を使う頻度はどのくらいですか', 'frequency', false, 6, 1),
('usage', '文章作成・要約・翻訳・調査など、複数の種類の業務でAIを活用している', 'agreement', false, 7, 1),
('usage', 'AIの活用によって、業務時間の短縮や成果物の品質向上を実感している', 'agreement', false, 8, 1),
('usage', '定型業務だけでなく、企画やアイデア出しなど考える業務にもAIを使っている', 'agreement', false, 9, 1),
('usage', 'AIを使った自分なりの仕事の進め方(手順やお決まりのプロンプト)ができている', 'agreement', false, 10, 1),
-- 3. 組織推進度
('org_drive', '経営層が、AI活用の方針やビジョンを明確に発信している', 'agreement', false, 11, 1),
('org_drive', '会社として、AIツールの導入・利用に必要な投資(予算・有料ライセンス)を行っている', 'agreement', false, 12, 1),
('org_drive', '社内に、AI活用を推進する担当者やチームが存在する', 'agreement', false, 13, 1),
('org_drive', 'AIの使い方を学べる研修や学習機会が、会社から提供されている', 'agreement', false, 14, 1),
-- 4. 浸透度
('culture', '自分の部署では、多くのメンバーが日常的にAIを活用している', 'agreement', false, 15, 1),
('culture', '同僚とAIの使い方やプロンプトを教え合う・共有する文化がある', 'agreement', false, 16, 1),
('culture', '社内でAI活用の成功事例が共有され、他の部署にも広がっている', 'agreement', false, 17, 1),
('culture', '業務で困りごとがあったとき、「AIで解決できないか」という発想が自然に出る', 'agreement', false, 18, 1),
-- 5. マインド・受容性
('mindset', 'AIに業務の一部を任せることに、不安よりも期待を感じる', 'agreement', false, 19, 1),
('mindset', 'AIの新しい使い方を試してみることに前向きである', 'agreement', false, 20, 1),
('mindset', 'AIスキルを身につけるための学習時間を、自分から確保している', 'agreement', false, 21, 1),
('mindset', 'AIによって自分の仕事が奪われるのではないかという不安を感じる', 'agreement', true, 22, 1),
('mindset', '「AIを使うより自分でやったほうが早い」と感じて、AIを使うのを避けることが多い', 'agreement', true, 23, 1),
-- 6. ガバナンス・セキュリティ
('governance', '会社に、AI利用に関するルールやガイドラインが整備されている', 'agreement', false, 24, 1),
('governance', '会社のAI利用ルールの内容を理解し、守って利用できている', 'agreement', false, 25, 1),
('governance', '機密情報や個人情報をAIに入力してはいけない場面を、自分で判断できる', 'agreement', false, 26, 1),
('governance', '情報漏えいなどの心配をせず、安心してAIを使える環境が会社に整っている', 'agreement', false, 27, 1);

-- ---------- 初期ベンチマーク(理論分布 seed: mean 55 / sd 15 / n 100) ----------
insert into benchmarks (category, industry, size_band, mean, sd, n, source)
select cat, ind, sz, 55, 15, 100, 'seed'
from unnest(array['literacy','usage','org_drive','culture','mindset','governance','total']) cat,
     unnest(array['all','manufacturing','construction_realestate','it_telecom','finance_insurance',
                  'retail_wholesale','medical_welfare','education','transport_logistics',
                  'food_hospitality','professional_services','public','other']) ind,
     unnest(array['all','s1_10','s11_50','s51_100','s101_300','s301_1000','s1001_']) sz
where ind = 'all' or sz = 'all'   -- 全国 + 業種別 + 規模別(業種×規模は実データ蓄積後)
on conflict (category, industry, size_band) do nothing;

-- ---------- ローカル開発用ユーザー(本番では実行しないこと) ----------
-- admin@example.com / password123 (デジライズ管理者)
-- demo@example.com  / password123 (デモ企業担当者)
do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_demo_id  uuid := '00000000-0000-0000-0000-000000000002';
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
     'admin@example.com', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_demo_id, 'authenticated', 'authenticated',
     'demo@example.com', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now())
  on conflict (id) do nothing;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), v_admin_id, v_admin_id::text,
     jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@example.com'),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_demo_id, v_demo_id::text,
     jsonb_build_object('sub', v_demo_id::text, 'email', 'demo@example.com'),
     'email', now(), now(), now())
  on conflict do nothing;

  insert into admin_users (user_id) values (v_admin_id) on conflict do nothing;
end $$;

-- ---------- デモ企業 + ダミー回答50件 ----------
do $$
declare
  v_company_id uuid := '10000000-0000-0000-0000-000000000001';
  v_demo_user  uuid := '00000000-0000-0000-0000-000000000002';
  v_dept_ids uuid[];
  v_dept uuid;
  v_q record;
  v_answers jsonb;
  v_cat_scores jsonb;
  v_total numeric;
  v_raw int;
  v_bias numeric;
  v_role text;
  v_age text;
  i int;
begin
  insert into companies (id, name, industry, employee_size_band, expected_respondents)
  values (v_company_id, 'デモ株式会社', 'it_telecom', 's101_300', 80)
  on conflict (id) do nothing;

  insert into company_admins (user_id, company_id, name, email, phone)
  values (v_demo_user, v_company_id, 'デモ 太郎', 'demo@example.com', '03-0000-0000')
  on conflict (user_id) do nothing;

  insert into departments (company_id, name, sort_order) values
    (v_company_id, '営業部', 1), (v_company_id, '経理部', 2),
    (v_company_id, '開発部', 3), (v_company_id, '人事部', 4),
    (v_company_id, 'マーケティング部', 5)
  on conflict do nothing;

  insert into survey_links (company_id, token)
  values (v_company_id, 'demo0000demo0000demo0000demo0000')
  on conflict (token) do nothing;

  select array_agg(id order by sort_order) into v_dept_ids
  from departments where company_id = v_company_id;

  if (select count(*) from responses where company_id = v_company_id) > 0 then
    return; -- 二重seed防止
  end if;

  for i in 1..50 loop
    -- 部署ごとに傾向差をつける(開発部・マーケが高め、経理が低め)
    v_dept := v_dept_ids[1 + floor(random() * 5)::int];
    v_bias := case v_dept
      when v_dept_ids[3] then 0.9  when v_dept_ids[5] then 0.5
      when v_dept_ids[1] then 0.0  when v_dept_ids[4] then -0.3
      else -0.8 end;
    v_role := (array['executive','manager','staff','staff','staff'])[1 + floor(random() * 5)::int];
    v_age  := (array['u20s','30s','30s','40s','50s'])[1 + floor(random() * 5)::int];

    v_answers := '{}';
    for v_q in select id, category, is_reversed from questions where is_active loop
      v_raw := greatest(1, least(5, round(3 + v_bias + (random() - 0.5) * 2.4)::int));
      if v_q.is_reversed then
        v_raw := greatest(1, least(5, round(3 - v_bias + (random() - 0.5) * 2.4)::int));
      end if;
      v_answers := v_answers || jsonb_build_object(v_q.id::text, v_raw);
    end loop;

    -- カテゴリースコア = 反転処理後の平均を0-100換算
    select jsonb_object_agg(category, score) into v_cat_scores
    from (
      select q.category,
             round((avg(case when q.is_reversed
                  then 6 - (v_answers ->> q.id::text)::numeric
                  else (v_answers ->> q.id::text)::numeric end) - 1) / 4 * 100, 1) score
      from questions q where q.is_active group by q.category
    ) s;

    select round(avg(value::numeric), 1) into v_total
    from jsonb_each_text(v_cat_scores);

    insert into responses (company_id, department_id, role_band, age_band,
      question_version, answers, free_text, category_scores, total_score, created_at)
    values (v_company_id, v_dept, v_role, v_age, 1, v_answers,
      case when random() < 0.2 then
        (array['議事録の要約に使いたいが、社内ルールが曖昧で踏み出せない',
               '部署によって活用度の差が大きく、ノウハウ共有の場がほしい',
               '有料ツールの利用申請フローが分かりにくい',
               'プロンプトの書き方を学べる研修がほしい',
               'セキュリティが心配で顧客情報を扱う業務には使えていない'])[1 + floor(random() * 5)::int]
      end,
      v_cat_scores, v_total,
      now() - (random() * interval '14 days'));
  end loop;
end $$;
