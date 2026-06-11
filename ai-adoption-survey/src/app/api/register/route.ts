import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, surveyUrlEmailHtml } from "@/lib/email";
import { INDUSTRIES, SIZE_BANDS } from "@/lib/constants";

const schema = z.object({
  company: z.object({
    name: z.string().trim().min(1).max(100),
    industry: z.enum(INDUSTRIES.map((i) => i.code) as [string, ...string[]]),
    employee_size_band: z.enum(SIZE_BANDS.map((s) => s.code) as [string, ...string[]]),
    expected_respondents: z.number().int().min(1).max(100000).nullable().optional(),
  }),
  admin: z.object({
    name: z.string().trim().min(1).max(60),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    password: z.string().min(8).max(72),
  }),
  departments: z.array(z.string().trim().min(1).max(60)).min(1).max(50),
});

export async function POST(request: Request) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "入力内容に誤りがあります" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const departments = Array.from(new Set(body.departments));

  // 1. 認証ユーザー作成
  const { data: userData, error: userError } =
    await supabase.auth.admin.createUser({
      email: body.admin.email,
      password: body.admin.password,
      email_confirm: true,
    });
  if (userError || !userData.user) {
    const message = userError?.message?.includes("already")
      ? "このメールアドレスは既に登録されています"
      : "アカウントの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const userId = userData.user.id;

  try {
    // 2. 企業・担当者・部署・サーベイリンク作成
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: body.company.name,
        industry: body.company.industry,
        employee_size_band: body.company.employee_size_band,
        expected_respondents: body.company.expected_respondents ?? null,
      })
      .select()
      .single();
    if (companyError || !company) throw companyError;

    const { error: adminError } = await supabase.from("company_admins").insert({
      user_id: userId,
      company_id: company.id,
      name: body.admin.name,
      email: body.admin.email,
      phone: body.admin.phone || null,
    });
    if (adminError) throw adminError;

    const { error: deptError } = await supabase.from("departments").insert(
      departments.map((name, i) => ({
        company_id: company.id,
        name,
        sort_order: i + 1,
      }))
    );
    if (deptError) throw deptError;

    const token = randomBytes(24).toString("base64url");
    const { error: linkError } = await supabase.from("survey_links").insert({
      company_id: company.id,
      token,
    });
    if (linkError) throw linkError;

    // 3. URL通知メール(失敗しても登録は成功扱い)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const surveyUrl = `${appUrl}/s/${token}`;
    try {
      await sendEmail(
        body.admin.email,
        `【AI活用レベル診断】${body.company.name} のサーベイURLが発行されました`,
        surveyUrlEmailHtml({
          adminName: body.admin.name,
          companyName: body.company.name,
          surveyUrl,
          dashboardUrl: `${appUrl}/dashboard`,
        })
      );
    } catch (e) {
      console.error("メール送信に失敗:", e);
    }

    return NextResponse.json({ ok: true, survey_url: surveyUrl });
  } catch (e) {
    console.error("登録処理に失敗:", e);
    // 途中失敗時はauthユーザーを削除してリトライ可能にする
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json(
      { error: "登録処理に失敗しました。時間をおいて再度お試しください" },
      { status: 500 }
    );
  }
}
