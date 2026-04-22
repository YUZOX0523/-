export default function CompletePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-violet-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          ご回答ありがとうございました！
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          回答を受け付けました。
          <br />
          診断結果は担当者より別途ご共有いたします。
        </p>
        <div className="bg-blue-50 rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-blue-800 mb-2">次のステップ</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>✓ 複数名で回答する場合は同じURLから回答できます</li>
            <li>✓ 全員の回答完了後、結果レポートをご確認ください</li>
            <li>✓ ご不明点はデジライズ担当者までお問い合わせください</li>
          </ul>
        </div>
        <p className="mt-6 text-xs text-gray-400">Powered by デジライズ株式会社</p>
      </div>
    </div>
  );
}
