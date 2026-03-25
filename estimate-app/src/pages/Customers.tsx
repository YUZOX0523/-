import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, User } from 'lucide-react';
import type { UseAppStore } from '../store';
import type { Customer } from '../types';

interface Props {
  store: UseAppStore;
}

type FormData = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY_FORM: FormData = {
  name: '',
  nameKana: '',
  postalCode: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  contactPerson: '',
};

export default function Customers({ store }: Props) {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = store;
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.includes(search) ||
      c.nameKana.includes(search) ||
      c.contactPerson.includes(search) ||
      c.address.includes(search)
  );

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditId(c.id);
    setForm({
      name: c.name,
      nameKana: c.nameKana,
      postalCode: c.postalCode,
      address: c.address,
      phone: c.phone,
      fax: c.fax ?? '',
      email: c.email ?? '',
      contactPerson: c.contactPerson,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      updateCustomer(editId, form);
    } else {
      addCustomer(form);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    deleteCustomer(id);
    setDeleteConfirm(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">顧客管理</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          顧客追加
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="会社名・担当者・住所で検索..."
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <User size={36} className="mx-auto mb-2 opacity-30" />
            <p>{search ? '検索結果がありません' : '顧客がまだ登録されていません'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">会社名</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">担当者</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">電話番号</th>
                  <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">住所</th>
                  <th className="text-center px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.nameKana}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{c.contactPerson}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-500 hidden xl:table-cell text-xs">{c.address}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="編集"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors"
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

      {/* Customer Form Modal */}
      {modalOpen && (
        <Modal title={editId ? '顧客編集' : '顧客追加'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="会社名 *" required>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="株式会社○○建設"
                />
              </Field>
              <Field label="フリガナ">
                <input
                  type="text"
                  value={form.nameKana}
                  onChange={(e) => setForm({ ...form, nameKana: e.target.value })}
                  className="input"
                  placeholder="カブシキガイシャ○○ケンセツ"
                />
              </Field>
              <Field label="担当者名 *" required>
                <input
                  type="text"
                  required
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="input"
                  placeholder="山田 太郎"
                />
              </Field>
              <Field label="郵便番号">
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className="input"
                  placeholder="000-0000"
                />
              </Field>
            </div>
            <Field label="住所">
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input"
                placeholder="都道府県・市区町村・番地"
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="電話番号 *" required>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="00-0000-0000"
                />
              </Field>
              <Field label="FAX番号">
                <input
                  type="tel"
                  value={form.fax}
                  onChange={(e) => setForm({ ...form, fax: e.target.value })}
                  className="input"
                  placeholder="00-0000-0000"
                />
              </Field>
              <Field label="メールアドレス">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="info@example.co.jp"
                />
              </Field>
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

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal title="顧客削除の確認" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-6">
            「{customers.find((c) => c.id === deleteConfirm)?.name}」を削除しますか？<br />
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// Add global input style via JS (simpler than @layer)
const style = document.createElement('style');
style.textContent = `.input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; } .input:focus { border-color: #f97316; box-shadow: 0 0 0 2px rgba(249,115,22,0.2); }`;
document.head.appendChild(style);
