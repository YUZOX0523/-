import Link from "next/link";

export const metadata = { title: "プライバシーポリシー | AI活用レベル診断" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">プライバシーポリシー(AI活用レベル診断)</h1>
      <p className="mt-2 text-sm text-gray-500">
        ※本ページは雛形です。公開前に法務確認のうえ正式版に差し替えてください。
      </p>

      <section className="prose prose-sm mt-8 max-w-none space-y-6 text-gray-700">
        <div>
          <h2 className="font-bold">1. 取得する情報</h2>
          <p className="mt-2">
            本サービスでは、以下の情報を取得します。
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>
              企業担当者: 会社名、業種、従業員規模、担当者氏名、メールアドレス、電話番号
            </li>
            <li>
              サーベイ回答者: 部署、役職層(任意)、年代(任意)、設問への回答内容
            </li>
          </ul>
          <p className="mt-2 font-medium">
            サーベイ回答者の氏名・メールアドレス等の個人を特定できる情報は一切取得しません。回答は匿名で収集されます。
          </p>
        </div>
        <div>
          <h2 className="font-bold">2. 利用目的</h2>
          <ul className="mt-2 list-disc pl-6">
            <li>診断結果の算出・表示、ベンチマークデータ(統計値)の作成</li>
            <li>企業担当者への診断結果・サービスに関するご案内</li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold">3. 回答データの取り扱い</h2>
          <ul className="mt-2 list-disc pl-6">
            <li>回答データは部署・属性単位で統計処理し、個人が特定できる形では表示しません。</li>
            <li>回答者が3名未満の部署のスコアは表示されません。</li>
            <li>ベンチマークには企業を特定できない統計値のみを使用します。</li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold">4. 第三者提供</h2>
          <p className="mt-2">
            法令に基づく場合を除き、取得した情報を本人の同意なく第三者に提供しません。
          </p>
        </div>
        <div>
          <h2 className="font-bold">5. お問い合わせ</h2>
          <p className="mt-2">
            本ポリシーに関するお問い合わせは、株式会社デジライズ(
            <a href="https://digirise.ai/" className="text-brand-600 underline">
              https://digirise.ai/
            </a>
            )までご連絡ください。
          </p>
        </div>
      </section>

      <div className="mt-10">
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          ← トップへ戻る
        </Link>
      </div>
    </main>
  );
}
