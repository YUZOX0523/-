import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeScores, levelForScore, type Question } from "@/lib/scoring";
import { ROLE_BANDS, AGE_BANDS } from "@/lib/constants";

async function findActiveLink(token: string) {
  const supabase = createAdminClient();
  const { data: link } = await supabase
    .from("survey_links")
    .select("id, company_id, is_active, expires_at, companies(id, name)")
    .eq("token", token)
    .single();
  if (
    !link ||
    !link.is_active ||
    (link.expires_at && new Date(link.expires_at) < new Date())
  ) {
    return null;
  }
  return link;
}

/** サーベイのメタ情報(企業名・部署・設問)を返す */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const link = await findActiveLink(params.token);
  if (!link) {
    return NextResponse.json({ error: "無効なURLです" }, { status: 404 });
  }
  const supabase = createAdminClient();
  const [{ data: departments }, { data: questions }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", link.company_id)
      .order("sort_order"),
    supabase
      .from("questions")
      .select("id, category, text, scale_type, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const company = Array.isArray(link.companies) ? link.companies[0] : link.companies;
  return NextResponse.json({
    company_name: company?.name,
    departments: departments ?? [],
    questions: questions ?? [],
  });
}

const answerSchema = z.object({
  department_id: z.string().uuid(),
  role_band: z
    .enum(ROLE_BANDS.map((r) => r.code) as [string, ...string[]])
    .nullable()
    .optional(),
  age_band: z
    .enum(AGE_BANDS.map((a) => a.code) as [string, ...string[]])
    .nullable()
    .optional(),
  answers: z.record(z.string().uuid(), z.number().int().min(1).max(5)),
  free_text: z.string().trim().max(2000).optional(),
});

/** 回答を受け付けてスコアを計算・保存する(回答POSTはこの経路のみ) */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const link = await findActiveLink(params.token);
  if (!link) {
    return NextResponse.json({ error: "無効なURLです" }, { status: 404 });
  }

  let body: z.infer<typeof answerSchema>;
  try {
    body = answerSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "回答内容に誤りがあります" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 部署がこの企業のものか検証
  const { data: dept } = await supabase
    .from("departments")
    .select("id")
    .eq("id", body.department_id)
    .eq("company_id", link.company_id)
    .single();
  if (!dept) {
    return NextResponse.json({ error: "部署の指定が不正です" }, { status: 400 });
  }

  const [{ data: questions }, { data: config }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, category, text, scale_type, is_reversed, sort_order, version")
      .eq("is_active", true),
    supabase.from("scoring_config").select("*").eq("id", 1).single(),
  ]);
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: "設問の取得に失敗しました" }, { status: 500 });
  }

  let categoryScores: Record<string, number>;
  let totalScore: number;
  try {
    ({ categoryScores, totalScore } = computeScores(
      questions as Question[],
      body.answers,
      config?.weights
    ));
  } catch {
    return NextResponse.json(
      { error: "すべての設問に回答してください" },
      { status: 400 }
    );
  }

  const { data: response, error } = await supabase
    .from("responses")
    .insert({
      company_id: link.company_id,
      department_id: body.department_id,
      role_band: body.role_band ?? null,
      age_band: body.age_band ?? null,
      question_version: questions[0].version ?? 1,
      answers: body.answers,
      free_text: body.free_text || null,
      category_scores: categoryScores,
      total_score: totalScore,
    })
    .select("id")
    .single();
  if (error || !response) {
    console.error("回答の保存に失敗:", error);
    return NextResponse.json({ error: "回答の保存に失敗しました" }, { status: 500 });
  }

  const level = levelForScore(totalScore, config?.level_thresholds);
  return NextResponse.json({
    response_id: response.id,
    total_score: totalScore,
    category_scores: categoryScores,
    level,
  });
}
