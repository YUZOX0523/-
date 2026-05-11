import { DigiRiseLogoMark } from '@/components/DigiRiseLogo';

export default function CompletePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0A0520 0%, #160835 40%, #0A1A40 100%)' }}
    >
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center">
        {/* Success icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #7B3FFF20, #00D4FF20)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7B3FFF, #00D4FF)' }}
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ご回答ありがとうございました！
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          回答を受け付けました。<br />
          診断結果は担当者より別途ご共有いたします。
        </p>

        <div
          className="rounded-2xl p-5 text-left mb-6"
          style={{ background: 'linear-gradient(135deg, #7B3FFF08, #00D4FF08)', border: '1px solid #7B3FFF20' }}
        >
          <p className="text-xs font-bold mb-3" style={{ color: '#7B3FFF' }}>次のステップ</p>
          <ul className="space-y-2">
            {[
              '複数名で回答する場合は同じURLから回答できます',
              '全員の回答完了後、結果レポートをご確認ください',
              'ご不明点はDigiRise担当者までお問い合わせください',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #7B3FFF, #00D4FF)' }}
                >
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-400">
          <DigiRiseLogoMark size={20} />
          <span className="text-xs">Powered by DigiRise株式会社</span>
        </div>
      </div>
    </div>
  );
}
