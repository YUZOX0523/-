import { useState } from 'react';
import {
  Search,
  Filter,
  Pencil,
  Trash2,
  Eye,
  X,
  FileText,
  ChevronDown,
} from 'lucide-react';
import type { UseAppStore } from '../store';
import type { Estimate, EstimateStatus } from '../types';
import { ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from '../types';

interface Props {
  store: UseAppStore;
  onEdit: (estimate: Estimate) => void;
  onView: (estimate: Estimate) => void;
}

const STATUS_OPTIONS: EstimateStatus[] = ['draft', 'submitted', 'approved', 'ordered', 'rejected'];

export default function EstimateList({ store, onEdit, onView }: Props) {
  const { estimates, deleteEstimate, updateEstimateStatus } = store;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusPopup, setStatusPopup] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'updated'>('updated');

  const filtered = estimates
    .filter((e) => {
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchSearch =
        !search ||
        e.estimateNumber.includes(search) ||
        e.customerName.includes(search) ||
        e.projectName.includes(search) ||
        e.projectLocation.includes(search);
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.estimateDate).getTime() - new Date(a.estimateDate).getTime();
      if (sortBy === 'total') return b.total - a.total;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const fmt = (n: number) => n.toLocaleString('ja-JP');
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

  function handleDelete(id: string) {
    deleteEstimate(id);
    setDeleteConfirm(null);
  }

  const counts = STATUS_OPTIONS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = estimates.filter((e) => e.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">見積書一覧</h1>
        <div className="text-sm text-gray-500">{filtered.length}件表示</div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-700 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          すべて（{estimates.length}）
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-slate-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {ESTIMATE_STATUS_LABELS[s]}（{counts[s] ?? 0}）
          </button>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="見積番号・顧客名・工事名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="updated">更新日順</option>
            <option value="date">見積日順</option>
            <option value="total">金額順</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <FileText size={36} className="mx-auto mb-2 opacity-30" />
            <p>{search || statusFilter !== 'all' ? '該当する見積書がありません' : '見積書がまだありません'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium">見積番号</th>
                  <th className="text-left px-4 py-3 font-medium">顧客名</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">工事名</th>
                  <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">見積日</th>
                  <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">有効期限</th>
                  <th className="text-right px-4 py-3 font-medium">合計（税込）</th>
                  <th className="text-center px-4 py-3 font-medium">ステータス</th>
                  <th className="text-center px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 relative">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.estimateNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{e.customerName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-xs truncate">
                      {e.projectName}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 hidden lg:table-cell">
                      {fmtDate(e.estimateDate)}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span
                        className={
                          new Date(e.validUntil) < new Date()
                            ? 'text-red-500 text-xs'
                            : 'text-gray-500 text-xs'
                        }
                      >
                        {fmtDate(e.validUntil)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      ¥{fmt(e.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setStatusPopup(statusPopup === e.id ? null : e.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer ${ESTIMATE_STATUS_COLORS[e.status]}`}
                        >
                          {ESTIMATE_STATUS_LABELS[e.status]}
                          <ChevronDown size={11} />
                        </button>
                        {statusPopup === e.id && (
                          <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg min-w-28 py-1">
                            {STATUS_OPTIONS.map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  updateEstimateStatus(e.id, s);
                                  setStatusPopup(null);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${e.status === s ? 'font-bold' : ''}`}
                              >
                                {ESTIMATE_STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onView(e)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title="詳細・印刷"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => onEdit(e)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                          title="編集"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(e.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                          title="削除"
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
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">削除の確認</h2>
              <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 mb-6">
                「{estimates.find((e) => e.id === deleteConfirm)?.estimateNumber}」を削除しますか？<br />
                この操作は元に戻せません。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close status popup on outside click */}
      {statusPopup && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setStatusPopup(null)}
        />
      )}
    </div>
  );
}
