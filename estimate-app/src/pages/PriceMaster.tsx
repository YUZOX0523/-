import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, Database } from 'lucide-react';
import type { UseAppStore } from '../store';
import type { PriceMasterItem, WorkCategory } from '../types';

interface Props {
  store: UseAppStore;
}

type FormData = Omit<PriceMasterItem, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY_FORM: FormData = {
  category: '基礎工事',
  name: '',
  unit: '',
  unitPrice: 0,
  note: '',
};

export default function PriceMaster({ store }: Props) {
  const { priceMasterItems, addPriceMasterItem, updatePriceMasterItem, deletePriceMasterItem, WORK_CATEGORIES } = store;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WorkCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = priceMasterItems.filter((p) => {
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchSearch =
      !search ||
      p.name.includes(search) ||
      p.category.includes(search) ||
      p.unit.includes(search);
    return matchCat && matchSearch;
  });

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: PriceMasterItem) {
    setEditId(p.id);
    setForm({ category: p.category, name: p.name, unit: p.unit, unitPrice: p.unitPrice, note: p.note ?? '' });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      updatePriceMasterItem(editId, form);
    } else {
      addPriceMasterItem(form);
    }
    setModalOpen(false);
  }

  const fmt = (n: number) => n.toLocaleString('ja-JP');

  // Group by category
  const grouped = filtered.reduce<Record<string, PriceMasterItem[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">工事単価マスタ</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          単価追加
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="工事名・種別で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as WorkCategory | 'all')}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="all">すべての種別</option>
          {WORK_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table grouped by category */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
          <Database size={36} className="mx-auto mb-2 opacity-30" />
          <p>該当するデータがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(categoryFilter === 'all' ? WORK_CATEGORIES : [categoryFilter]).map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-4 py-3 bg-slate-50 border-b border-gray-100 rounded-t-xl">
                  <span className="font-semibold text-gray-700 text-sm">{cat}</span>
                  <span className="ml-2 text-xs text-gray-400">{items.length}件</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-gray-50">
                        <th className="text-left px-4 py-2 font-medium">工事項目名</th>
                        <th className="text-center px-4 py-2 font-medium">単位</th>
                        <th className="text-right px-4 py-2 font-medium">単価（円）</th>
                        <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">備考</th>
                        <th className="text-center px-4 py-2 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{p.unit}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                            ¥{fmt(p.unitPrice)}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs hidden lg:table-cell">{p.note}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEdit(p)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(p.id)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {modalOpen && (
        <Modal title={editId ? '単価編集' : '単価追加'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">工事種別 <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as WorkCategory })}
                  className="input"
                >
                  {WORK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">工事項目名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="例：コンクリート打設"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">単位 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="input"
                  placeholder="m², m³, 式, 本..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">標準単価（円） <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">備考</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="input"
                  placeholder="備考・注記"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
              >
                {editId ? '更新する' : '登録する'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="削除の確認" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-6">
            「{priceMasterItems.find((p) => p.id === deleteConfirm)?.name}」を削除しますか？
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={() => { deletePriceMasterItem(deleteConfirm); setDeleteConfirm(null); }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
            >
              削除する
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
