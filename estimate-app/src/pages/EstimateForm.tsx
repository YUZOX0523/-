import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  ArrowLeft,
} from 'lucide-react';
import type { UseAppStore } from '../store';
import type { Estimate, EstimateLineItem, WorkCategory } from '../types';

interface Props {
  store: UseAppStore;
  editEstimate?: Estimate | null;
  onSave: () => void;
  onCancel: () => void;
}

type LineForm = Omit<EstimateLineItem, 'id' | 'amount'> & { id: string; amount: number };

export default function EstimateForm({ store, editEstimate, onSave, onCancel }: Props) {
  const { customers, priceMasterItems, addEstimate, updateEstimate, WORK_CATEGORIES } = store;

  const today = new Date().toISOString().split('T')[0];
  const validUntilDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [customerId, setCustomerId] = useState(editEstimate?.customerId ?? '');
  const [projectName, setProjectName] = useState(editEstimate?.projectName ?? '');
  const [projectLocation, setProjectLocation] = useState(editEstimate?.projectLocation ?? '');
  const [estimateDate, setEstimateDate] = useState(editEstimate?.estimateDate ?? today);
  const [validUntil, setValidUntil] = useState(editEstimate?.validUntil ?? validUntilDefault);
  const [constructionStartDate, setConstructionStartDate] = useState(editEstimate?.constructionStartDate ?? '');
  const [constructionEndDate, setConstructionEndDate] = useState(editEstimate?.constructionEndDate ?? '');
  const [taxRate, setTaxRate] = useState(editEstimate?.taxRate ?? 0.1);
  const [note, setNote] = useState(editEstimate?.note ?? '');
  const [lineItems, setLineItems] = useState<LineForm[]>(
    editEstimate?.lineItems ?? []
  );
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [masterCat, setMasterCat] = useState<WorkCategory | 'all'>('all');

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Recalc amounts when items change
  useEffect(() => {
    // nothing extra needed; amounts are recalculated inline
  }, []);

  function updateLine(id: string, field: keyof LineForm, value: string | number) {
    setLineItems((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        updated.amount = Math.round(Number(updated.quantity) * Number(updated.unitPrice));
        return updated;
      })
    );
  }

  function removeLine(id: string) {
    setLineItems((prev) => prev.filter((l) => l.id !== id));
  }

  function addBlankLine() {
    const newLine: LineForm = {
      id: Date.now().toString(36),
      category: 'その他',
      name: '',
      spec: '',
      unit: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      note: '',
    };
    setLineItems((prev) => [...prev, newLine]);
  }

  function addFromMaster(item: typeof priceMasterItems[0]) {
    const newLine: LineForm = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      category: item.category,
      name: item.name,
      spec: '',
      unit: item.unit,
      quantity: 1,
      unitPrice: item.unitPrice,
      amount: item.unitPrice,
      note: item.note ?? '',
    };
    setLineItems((prev) => [...prev, newLine]);
  }

  function moveLine(id: string, dir: 'up' | 'down') {
    setLineItems((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
  const taxAmount = Math.floor(subtotal * taxRate);
  const total = subtotal + taxAmount;
  const fmt = (n: number) => n.toLocaleString('ja-JP');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      alert('顧客を選択してください');
      return;
    }
    if (lineItems.length === 0) {
      alert('工事項目を1件以上追加してください');
      return;
    }
    const customer = customers.find((c) => c.id === customerId)!;
    const data = {
      customerId,
      customerName: customer.name,
      projectName,
      projectLocation,
      estimateDate,
      validUntil,
      constructionStartDate: constructionStartDate || undefined,
      constructionEndDate: constructionEndDate || undefined,
      lineItems: lineItems as EstimateLineItem[],
      taxRate,
      note,
      status: (editEstimate?.status ?? 'draft') as Estimate['status'],
    };
    if (editEstimate) {
      updateEstimate(editEstimate.id, data);
    } else {
      addEstimate(data);
    }
    onSave();
  }

  const filteredMaster = priceMasterItems.filter((p) => {
    const matchCat = masterCat === 'all' || p.category === masterCat;
    const matchSearch = !masterSearch || p.name.includes(masterSearch) || p.category.includes(masterSearch);
    return matchCat && matchSearch;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {editEstimate ? '見積書編集' : '新規見積書作成'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Section title="基本情報">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="flabel">顧客選択 <span className="text-red-500">*</span></label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input"
              >
                <option value="">-- 顧客を選択 --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}（{c.contactPerson}）</option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="mt-1 text-xs text-gray-500">
                  〒{selectedCustomer.postalCode} {selectedCustomer.address}　TEL: {selectedCustomer.phone}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="flabel">工事名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="input"
                placeholder="例：○○ビル外壁改修工事"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flabel">工事場所</label>
              <input
                type="text"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                className="input"
                placeholder="例：東京都新宿区○○○"
              />
            </div>
            <div>
              <label className="flabel">見積日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={estimateDate}
                onChange={(e) => setEstimateDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="flabel">有効期限 <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="flabel">工事開始予定日</label>
              <input
                type="date"
                value={constructionStartDate}
                onChange={(e) => setConstructionStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="flabel">工事完了予定日</label>
              <input
                type="date"
                value={constructionEndDate}
                onChange={(e) => setConstructionEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </Section>

        {/* Line Items */}
        <Section title="工事項目">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMasterModalOpen(true)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={15} />
              マスタから追加
            </button>
            <button
              type="button"
              onClick={addBlankLine}
              className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm"
            >
              <Plus size={15} />
              手動で追加
            </button>
          </div>

          {lineItems.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg py-12 text-center text-gray-400">
              <p className="mb-2">工事項目がありません</p>
              <p className="text-sm">「マスタから追加」または「手動で追加」してください</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200">
                <div className="col-span-1">種別</div>
                <div className="col-span-3">工事項目</div>
                <div className="col-span-1">仕様</div>
                <div className="col-span-1 text-center">単位</div>
                <div className="col-span-1 text-right">数量</div>
                <div className="col-span-2 text-right">単価(円)</div>
                <div className="col-span-2 text-right">金額(円)</div>
                <div className="col-span-1 text-center">操作</div>
              </div>
              <div className="divide-y divide-gray-100">
                {lineItems.map((line, idx) => (
                  <div key={line.id} className="px-3 py-2 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 md:col-span-1">
                        <select
                          value={line.category}
                          onChange={(e) => updateLine(line.id, 'category', e.target.value as WorkCategory)}
                          className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs"
                        >
                          {WORK_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <input
                          type="text"
                          value={line.name}
                          onChange={(e) => updateLine(line.id, 'name', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                          placeholder="工事項目名"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1">
                        <input
                          type="text"
                          value={line.spec ?? ''}
                          onChange={(e) => updateLine(line.id, 'spec', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                          placeholder="仕様"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <input
                          type="text"
                          value={line.unit}
                          onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center"
                          placeholder="m²"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, 'unitPrice', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                        />
                      </div>
                      <div className="col-span-10 md:col-span-2 text-right font-medium text-gray-800 text-sm pr-2">
                        ¥{fmt(line.amount)}
                      </div>
                      <div className="col-span-2 md:col-span-1 flex items-center justify-end md:justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveLine(line.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLine(line.id, 'down')}
                          disabled={idx === lineItems.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">小計</span>
                  <span className="font-medium">¥{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-600">消費税</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="border border-gray-200 rounded px-2 py-1 text-xs"
                    >
                      <option value={0.1}>10%</option>
                      <option value={0.08}>8%（軽減）</option>
                      <option value={0}>非課税</option>
                    </select>
                    <span className="font-medium">¥{fmt(taxAmount)}</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 bg-orange-50 px-3 rounded-lg">
                  <span className="font-bold text-gray-800">合計（税込）</span>
                  <span className="font-bold text-orange-600 text-lg">¥{fmt(total)}</span>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* Note */}
        <Section title="備考">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="特記事項・支払条件・その他備考を入力..."
          />
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
          >
            <Save size={16} />
            {editEstimate ? '更新する' : '見積書を保存する'}
          </button>
        </div>
      </form>

      {/* Master picker modal */}
      {masterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">工事単価マスタから追加</h2>
              <button onClick={() => setMasterModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-4 py-3 flex gap-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="工事名で検索..."
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <select
                value={masterCat}
                onChange={(e) => setMasterCat(e.target.value as WorkCategory | 'all')}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">すべて</option>
                {WORK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-xs text-gray-500">
                    <th className="text-left px-4 py-2 font-medium">種別</th>
                    <th className="text-left px-4 py-2 font-medium">工事項目</th>
                    <th className="text-center px-4 py-2 font-medium">単位</th>
                    <th className="text-right px-4 py-2 font-medium">単価（円）</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMaster.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50">
                      <td className="px-4 py-2 text-xs text-gray-500">{p.category}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{p.unit}</td>
                      <td className="px-4 py-2 text-right">¥{p.unitPrice.toLocaleString('ja-JP')}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => {
                            addFromMaster(p);
                            setMasterModalOpen(false);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs"
                        >
                          追加
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-3 bg-slate-50 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// Global styles for form labels
const s2 = document.createElement('style');
s2.textContent = `.flabel { display: block; font-size: 0.75rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; }`;
document.head.appendChild(s2);
