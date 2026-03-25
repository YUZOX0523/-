import { ArrowLeft, Printer, Pencil } from 'lucide-react';
import type { UseAppStore } from '../store';
import type { Estimate } from '../types';
import { ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from '../types';

interface Props {
  store: UseAppStore;
  estimate: Estimate;
  onBack: () => void;
  onEdit: (estimate: Estimate) => void;
}

export default function EstimateDetail({ store, estimate, onBack, onEdit }: Props) {
  const { customers } = store;
  const customer = customers.find((c) => c.id === estimate.customerId);

  const fmt = (n: number) => n.toLocaleString('ja-JP');
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  function handlePrint() {
    window.print();
  }

  const taxPct = Math.round(estimate.taxRate * 100);

  return (
    <div>
      {/* Action bar (hidden on print) */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">見積書詳細</h1>
          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${ESTIMATE_STATUS_COLORS[estimate.status]}`}>
            {ESTIMATE_STATUS_LABELS[estimate.status]}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(estimate)}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm"
          >
            <Pencil size={15} />
            編集
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Printer size={15} />
            PDF印刷
          </button>
        </div>
      </div>

      {/* Printable area */}
      <div
        id="print-area"
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto"
        style={{ fontFamily: "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-700">
          <div>
            <div className="text-3xl font-bold text-slate-800 mb-1">御 見 積 書</div>
            <div className="text-sm text-gray-500">ESTIMATE</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5">見積番号</div>
            <div className="font-mono font-bold text-slate-800">{estimate.estimateNumber}</div>
            <div className="text-xs text-gray-500 mt-2 mb-0.5">見積日</div>
            <div className="text-sm text-gray-700">{fmtDate(estimate.estimateDate)}</div>
            <div className="text-xs text-gray-500 mt-1 mb-0.5">有効期限</div>
            <div className="text-sm text-gray-700">{fmtDate(estimate.validUntil)}</div>
          </div>
        </div>

        {/* Customer & Company info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Customer */}
          <div>
            <div className="text-xs text-gray-400 mb-1">御見積先</div>
            <div className="text-xl font-bold text-slate-800 border-b border-slate-300 pb-1 mb-2">
              {estimate.customerName}　御中
            </div>
            {customer && (
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>担当：{customer.contactPerson}　様</div>
                <div>〒{customer.postalCode}</div>
                <div>{customer.address}</div>
                <div>TEL: {customer.phone}</div>
              </div>
            )}
          </div>

          {/* Our company */}
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">発行元</div>
            <div className="text-lg font-bold text-slate-800">ダイソー工事会社</div>
            <div className="text-xs text-gray-500 space-y-0.5 mt-1">
              <div>〒000-0000 ○○県○○市○○町1-1-1</div>
              <div>TEL: 00-0000-0000　FAX: 00-0000-0001</div>
              <div>担当：○○ ○○</div>
            </div>
            {/* Stamp placeholder */}
            <div className="mt-3 inline-flex items-center justify-center w-16 h-16 border-2 border-red-500 rounded-full text-red-500 text-xs font-bold">
              担当印
            </div>
          </div>
        </div>

        {/* Project info */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-gray-500">工事名：</span>
            <span className="font-medium text-gray-800">{estimate.projectName}</span>
          </div>
          {estimate.projectLocation && (
            <div>
              <span className="text-xs text-gray-500">工事場所：</span>
              <span className="text-gray-800">{estimate.projectLocation}</span>
            </div>
          )}
          {estimate.constructionStartDate && (
            <div>
              <span className="text-xs text-gray-500">工期（開始）：</span>
              <span className="text-gray-800">{fmtDate(estimate.constructionStartDate)}</span>
            </div>
          )}
          {estimate.constructionEndDate && (
            <div>
              <span className="text-xs text-gray-500">工期（完了）：</span>
              <span className="text-gray-800">{fmtDate(estimate.constructionEndDate)}</span>
            </div>
          )}
        </div>

        {/* Total amount highlight */}
        <div className="border-2 border-orange-400 rounded-lg p-4 mb-6 text-center">
          <div className="text-sm text-gray-500 mb-1">御見積金額（消費税込）</div>
          <div className="text-4xl font-bold text-orange-600">
            ¥{fmt(estimate.total)}
            <span className="text-lg ml-1">円</span>
          </div>
        </div>

        {/* Line items table */}
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="text-left px-3 py-2 text-xs font-medium w-6">No.</th>
              <th className="text-left px-3 py-2 text-xs font-medium">工事種別</th>
              <th className="text-left px-3 py-2 text-xs font-medium">工事項目</th>
              <th className="text-left px-3 py-2 text-xs font-medium hidden md:table-cell">仕様</th>
              <th className="text-center px-3 py-2 text-xs font-medium">単位</th>
              <th className="text-right px-3 py-2 text-xs font-medium">数量</th>
              <th className="text-right px-3 py-2 text-xs font-medium">単価（円）</th>
              <th className="text-right px-3 py-2 text-xs font-medium">金額（円）</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 text-center text-xs text-gray-400 border-b border-gray-100">
                  {idx + 1}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">{item.category}</td>
                <td className="px-3 py-2 font-medium text-gray-800 border-b border-gray-100">{item.name}</td>
                <td className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 hidden md:table-cell">
                  {item.spec}
                </td>
                <td className="px-3 py-2 text-center text-gray-600 border-b border-gray-100">{item.unit}</td>
                <td className="px-3 py-2 text-right text-gray-700 border-b border-gray-100">
                  {item.quantity.toLocaleString('ja-JP')}
                </td>
                <td className="px-3 py-2 text-right text-gray-700 border-b border-gray-100">
                  ¥{fmt(item.unitPrice)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800 border-b border-gray-100">
                  ¥{fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Subtotals */}
        <div className="flex justify-end mb-6">
          <div className="w-72">
            <div className="flex justify-between py-1.5 border-b border-gray-200 text-sm">
              <span className="text-gray-600">小計</span>
              <span className="font-medium">¥{fmt(estimate.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-200 text-sm">
              <span className="text-gray-600">消費税（{taxPct}%）</span>
              <span className="font-medium">¥{fmt(estimate.taxAmount)}</span>
            </div>
            <div className="flex justify-between py-3 bg-orange-50 px-3 rounded mt-1">
              <span className="font-bold text-gray-800">合計（税込）</span>
              <span className="font-bold text-orange-600 text-lg">¥{fmt(estimate.total)}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        {estimate.note && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1 font-medium">備考</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{estimate.note}</div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          本見積書の有効期限は発行日より30日間です。ご不明な点はお気軽にお問い合わせください。
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          #print-area {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 16mm !important;
            max-width: 100% !important;
          }
          aside, header { display: none !important; }
          .flex.h-screen { display: block !important; }
          main { padding: 0 !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}
