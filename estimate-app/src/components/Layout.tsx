import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  PlusCircle,
  Database,
  Menu,
  X,
  Building2,
} from 'lucide-react';

export type Page = 'dashboard' | 'customers' | 'price-master' | 'estimate-list' | 'estimate-new';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'ダッシュボード', icon: <LayoutDashboard size={20} /> },
  { page: 'customers', label: '顧客管理', icon: <Users size={20} /> },
  { page: 'price-master', label: '工事単価マスタ', icon: <Database size={20} /> },
  { page: 'estimate-list', label: '見積書一覧', icon: <FileText size={20} /> },
  { page: 'estimate-new', label: '新規見積作成', icon: <PlusCircle size={20} /> },
];

export default function Layout({ currentPage, onNavigate, children }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 text-white flex flex-col
          transform transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="bg-orange-500 rounded-lg p-2">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">ダイソー工事会社</div>
            <div className="text-xs text-slate-400">見積管理システム</div>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ page, label, icon }) => (
              <li key={page}>
                <button
                  onClick={() => {
                    onNavigate(page);
                    setMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                    transition-colors
                    ${
                      currentPage === page
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }
                  `}
                >
                  {icon}
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500">
          ver 1.0.0
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-orange-500" />
            <span className="font-bold text-gray-800 text-sm">ダイソー工事 見積管理</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
