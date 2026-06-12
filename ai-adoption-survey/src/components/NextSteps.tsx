import CopyText from "./CopyText";

export function distributionTemplate(surveyUrl: string): string {
  return `【ご協力のお願い】AI活用レベル診断(5〜10分・匿名)

社内のAI活用状況を把握し、今後の支援策に活かすため、
全社員対象のアンケートを実施します。

・所要時間: 5〜10分(スマホからでも回答できます)
・完全匿名: 氏名・メールアドレスの入力はありません
・回答直後に、あなた自身のAI活用スコアと全国比較がその場で表示されます

▼ 回答はこちらから
${surveyUrl}

ご協力よろしくお願いします!`;
}

/**
 * URL発行後に担当者がやることを図解する3ステップ。
 * 「全社の診断結果はダッシュボードでしか見られない」ことを強調する。
 */
export function NextSteps({ surveyUrl }: { surveyUrl?: string | null }) {
  const steps = [
    {
      icon: "📣",
      title: "STEP 1 社内にURLを展開",
      body: "サーベイURLを社内チャットやメールで社員に共有します。下の「展開用の文面」をコピーすればそのまま使えます。",
    },
    {
      icon: "✍️",
      title: "STEP 2 社員が回答(5〜10分)",
      body: "回答は匿名。社員には回答直後に個人スコアが表示されます。もちろん、あなた自身も回答してOKです。",
    },
    {
      icon: "📊",
      title: "STEP 3 ダッシュボードで全社結果を見る",
      body: "会社全体の偏差値・部署別ヒートマップ・推奨アクションは、ログイン後のダッシュボードだけで見られます。回答が集まるそばからリアルタイムに反映されます。",
      highlight: true,
    },
  ];
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className={`relative rounded-2xl border p-4 text-left ${
              s.highlight
                ? "border-brand-300 bg-gradient-to-b from-brand-50 to-white shadow-card"
                : "border-gray-200 bg-white"
            }`}
          >
            {s.highlight && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-flame px-2 py-0.5 text-[10px] font-bold text-white">
                ここが本体!
              </span>
            )}
            <p className="text-2xl">{s.icon}</p>
            <p className="mt-2 text-sm font-bold">{s.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{s.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
        ⚠️ <strong>ご注意:</strong> サーベイに回答して表示されるのは「あなた個人の結果」だけです。
        <strong>会社全体・部署ごとの診断(偏差値・ヒートマップ・改善提案)は、ダッシュボードにログインして確認してください。</strong>
      </p>

      {surveyUrl && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-bold">📋 社内展開用の文面(コピーしてそのまま使えます)</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600">
            {distributionTemplate(surveyUrl)}
          </pre>
          <div className="mt-3">
            <CopyText
              text={distributionTemplate(surveyUrl)}
              label="案内文をまるごとコピー"
            />
          </div>
        </div>
      )}
    </div>
  );
}
