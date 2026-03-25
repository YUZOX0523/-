import { FileText, Users, TrendingUp, CheckCircle, Clock, XCircle, Award } from 'lucide-react';
import type { UseAppStore } from '../store';
import type { EstimateStatus } from '../types';
import { ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from '../types';

interface Props {
  store: UseAppStore;
  onNavigate: (page: 'estimate-list' | 'estimate-new' | 'customers') => void;
}

export default function Dashboard({ store, onNavigate }: Props) {
  const { estimates, customers } = store;

  const now = new Date();
  const thisMonth = estimates.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const byStatus = (status: EstimateStatus) => estimates.filter((e) => e.status === status).length;

  const totalAmount = estimates
    .filter((e) => e.status === 'ordered')
    .reduce((s, e) => s + e.total, 0);

  const submittedTotal = estimates
    .filter((e) => ['submitted', 'approved', 'ordered'].includes(e.status))
    .reduce((s, e) => s + e.total, 0);

  const recentEstimates = [...estimates]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const fmt = (n: number) => n.toLocaleString('ja-JP');
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<FileText size={22} />}
          color="blue"
          label="見積件数（今月）"
          value={`${thisMonth.length}件`}
          sub={`累計: ${estimates.length}件`}
        />
        <StatCard
          icon={<Users size={22} />}
          color="green"
          label="顧客数"
          value={`${customers.length}社`}
          sub="登録顧客"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          color="orange"
          label="受注金額（累計）"
          value={`¥${fmt(totalAmount)}`}
          sub="受注済み合計"
        />
        <StatCard
          icon={<Award size={22} />}
          color="purple"
          label="提出済み金額"
          value={`¥${fmt(submittedTotal)}`}
          sub="提出・承認・受注合計"
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">ステータス別件数</h2>
          <div className="space-y-3">
            {(
              [
                { status: 'draft' as EstimateStatus, icon: <Clock size={16} /> },
                { status: 'submitted' as EstimateStatus, icon: <FileText size={16} /> },
                { status: 'approved' as EstimateStatus, icon: <CheckCircle size={16} /> },
                { status: 'ordered' as EstimateStatus, icon: <Award size={16} /> },
                { status: 'rejected' as EstimateStatus, icon: <XCircle size={16} /> },
              ] as const
            ).map(({ status, icon }) => {
              const count = byStatus(status);
              const pct = estimates.length > 0 ? (count / estimates.length) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${ESTIMATE_STATUS_COLORS[status]}`}>
                        {icon}
                        {ESTIMATE_STATUS_LABELS[status]}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{count}件</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-orange-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">クイックアクション</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('estimate-new')}
              className="w-full flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-left transition-colors"
            >
              <div className="bg-orange-500 text-white rounded-lg p-2">
                <FileText size={18} />
              </div>
              <div>
                <div className="font-medium text-gray-800">新規見積書を作成</div>
                <div className="text-xs text-gray-500">顧客・工事項目を選んで素早く作成</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('estimate-list')}
              className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors"
            >
              <div className="bg-blue-500 text-white rounded-lg p-2">
                <FileText size={18} />
              </div>
              <div>
                <div className="font-medium text-gray-800">見積書一覧を見る</div>
                <div className="text-xs text-gray-500">ステータス確認・検索・PDF出力</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('customers')}
              className="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-left transition-colors"
            >
              <div className="bg-green-500 text-white rounded-lg p-2">
                <Users size={18} />
              </div>
              <div>
                <div className="font-medium text-gray-800">顧客を管理する</div>
                <div className="text-xs text-gray-500">顧客の登録・編集・削除</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent estimates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-700">最近の見積書</h2>
          <button
            onClick={() => onNavigate('estimate-list')}
            className="text-sm text-orange-500 hover:text-orange-700 font-medium"
          >
            すべて見る →
          </button>
        </div>
        {recentEstimates.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            <FileText size={36} className="mx-auto mb-2 opacity-30" />
            <p>見積書がまだありません</p>
            <button
              onClick={() => onNavigate('estimate-new')}
              className="mt-3 text-orange-500 hover:underline text-sm"
            >
              最初の見積書を作成する
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">見積番号</th>
                  <th className="text-left px-4 py-3 font-medium">顧客名</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">工事名</th>
                  <th className="text-right px-4 py-3 font-medium">合計金額</th>
                  <th className="text-center px-4 py-3 font-medium">ステータス</th>
                  <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">更新日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentEstimates.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.estimateNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{e.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-xs truncate">{e.projectName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">¥{fmt(e.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ESTIMATE_STATUS_COLORS[e.status]}`}>
                        {ESTIMATE_STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 hidden lg:table-cell">{fmtDate(e.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
  label: string;
  value: string;
  sub: string;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}
