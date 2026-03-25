import { useState, useCallback } from 'react';
import type {
  AppState,
  Customer,
  PriceMasterItem,
  Estimate,
  EstimateLineItem,
  WorkCategory,
} from '../types';

const STORAGE_KEY = 'daisou_estimate_app';

const DEFAULT_PRICE_MASTER: PriceMasterItem[] = [
  { id: 'pm1', category: '基礎工事', name: 'コンクリート打設', unit: 'm³', unitPrice: 25000, createdAt: '', updatedAt: '' },
  { id: 'pm2', category: '基礎工事', name: '型枠工事', unit: 'm²', unitPrice: 4500, createdAt: '', updatedAt: '' },
  { id: 'pm3', category: '基礎工事', name: '鉄筋加工・組立', unit: 't', unitPrice: 180000, createdAt: '', updatedAt: '' },
  { id: 'pm4', category: '解体工事', name: '木造家屋解体', unit: 'm²', unitPrice: 18000, createdAt: '', updatedAt: '' },
  { id: 'pm5', category: '解体工事', name: 'コンクリート解体', unit: 'm³', unitPrice: 35000, createdAt: '', updatedAt: '' },
  { id: 'pm6', category: '土木工事', name: '土工（掘削）', unit: 'm³', unitPrice: 2800, createdAt: '', updatedAt: '' },
  { id: 'pm7', category: '土木工事', name: '残土処分', unit: 'm³', unitPrice: 4500, createdAt: '', updatedAt: '' },
  { id: 'pm8', category: '土木工事', name: 'アスファルト舗装', unit: 'm²', unitPrice: 4200, createdAt: '', updatedAt: '' },
  { id: 'pm9', category: '建築工事', name: '木工事（大工手間）', unit: '日', unitPrice: 28000, createdAt: '', updatedAt: '' },
  { id: 'pm10', category: '内装工事', name: 'クロス張替え', unit: 'm²', unitPrice: 1200, createdAt: '', updatedAt: '' },
  { id: 'pm11', category: '内装工事', name: 'フローリング張替え', unit: 'm²', unitPrice: 8500, createdAt: '', updatedAt: '' },
  { id: 'pm12', category: '外装工事', name: '外壁塗装（2液ウレタン）', unit: 'm²', unitPrice: 3500, createdAt: '', updatedAt: '' },
  { id: 'pm13', category: '外装工事', name: '屋根塗装', unit: 'm²', unitPrice: 2800, createdAt: '', updatedAt: '' },
  { id: 'pm14', category: '外装工事', name: '足場組立・解体', unit: 'm²', unitPrice: 850, createdAt: '', updatedAt: '' },
  { id: 'pm15', category: '電気工事', name: '電気配線工事（一式）', unit: '式', unitPrice: 120000, createdAt: '', updatedAt: '' },
  { id: 'pm16', category: '給排水工事', name: '給排水配管工事（一式）', unit: '式', unitPrice: 150000, createdAt: '', updatedAt: '' },
  { id: 'pm17', category: '塗装工事', name: '鉄部塗装', unit: 'm²', unitPrice: 2200, createdAt: '', updatedAt: '' },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: '株式会社サンプル建設',
    nameKana: 'カブシキガイシャサンプルケンセツ',
    postalCode: '160-0023',
    address: '東京都新宿区西新宿2-1-1',
    phone: '03-1234-5678',
    fax: '03-1234-5679',
    email: 'info@sample-kensetsu.co.jp',
    contactPerson: '田中 太郎',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AppState;
    }
  } catch {
    // ignore
  }
  const now = new Date().toISOString();
  return {
    customers: DEFAULT_CUSTOMERS,
    priceMasterItems: DEFAULT_PRICE_MASTER.map((p) => ({ ...p, createdAt: now, updatedAt: now })),
    estimates: [],
    nextEstimateSeq: 1,
  };
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateEstimateNumber(seq: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `EST-${year}${month}-${String(seq).padStart(4, '0')}`;
}

export function useAppStore() {
  const [state, setStateRaw] = useState<AppState>(loadState);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  // --- Customer CRUD ---
  const addCustomer = useCallback(
    (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const customer: Customer = { ...data, id: generateId(), createdAt: now, updatedAt: now };
      setState((prev) => ({ ...prev, customers: [...prev.customers, customer] }));
      return customer;
    },
    [setState]
  );

  const updateCustomer = useCallback(
    (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
        ),
      }));
    },
    [setState]
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, customers: prev.customers.filter((c) => c.id !== id) }));
    },
    [setState]
  );

  // --- PriceMaster CRUD ---
  const addPriceMasterItem = useCallback(
    (data: Omit<PriceMasterItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const item: PriceMasterItem = { ...data, id: generateId(), createdAt: now, updatedAt: now };
      setState((prev) => ({ ...prev, priceMasterItems: [...prev.priceMasterItems, item] }));
      return item;
    },
    [setState]
  );

  const updatePriceMasterItem = useCallback(
    (id: string, data: Partial<Omit<PriceMasterItem, 'id' | 'createdAt'>>) => {
      setState((prev) => ({
        ...prev,
        priceMasterItems: prev.priceMasterItems.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
        ),
      }));
    },
    [setState]
  );

  const deletePriceMasterItem = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        priceMasterItems: prev.priceMasterItems.filter((p) => p.id !== id),
      }));
    },
    [setState]
  );

  // --- Estimate CRUD ---
  const addEstimate = useCallback(
    (
      data: Omit<Estimate, 'id' | 'estimateNumber' | 'subtotal' | 'taxAmount' | 'total' | 'createdAt' | 'updatedAt'>
    ) => {
      const now = new Date().toISOString();
      const subtotal = data.lineItems.reduce((s, l) => s + l.amount, 0);
      const taxAmount = Math.floor(subtotal * data.taxRate);
      const total = subtotal + taxAmount;
      let estimateNumber = '';
      setState((prev) => {
        estimateNumber = generateEstimateNumber(prev.nextEstimateSeq);
        const estimate: Estimate = {
          ...data,
          id: generateId(),
          estimateNumber,
          subtotal,
          taxAmount,
          total,
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...prev,
          estimates: [...prev.estimates, estimate],
          nextEstimateSeq: prev.nextEstimateSeq + 1,
        };
      });
    },
    [setState]
  );

  const updateEstimate = useCallback(
    (
      id: string,
      data: Partial<Omit<Estimate, 'id' | 'estimateNumber' | 'createdAt'>>
    ) => {
      setState((prev) => ({
        ...prev,
        estimates: prev.estimates.map((e) => {
          if (e.id !== id) return e;
          const lineItems = data.lineItems ?? e.lineItems;
          const taxRate = data.taxRate ?? e.taxRate;
          const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
          const taxAmount = Math.floor(subtotal * taxRate);
          const total = subtotal + taxAmount;
          return {
            ...e,
            ...data,
            subtotal,
            taxAmount,
            total,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [setState]
  );

  const deleteEstimate = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, estimates: prev.estimates.filter((e) => e.id !== id) }));
    },
    [setState]
  );

  const updateEstimateStatus = useCallback(
    (id: string, status: Estimate['status']) => {
      updateEstimate(id, { status });
    },
    [updateEstimate]
  );

  // Helper: create a line item
  const createLineItem = useCallback(
    (data: Omit<EstimateLineItem, 'id' | 'amount'>): EstimateLineItem => ({
      ...data,
      id: generateId(),
      amount: Math.round(data.quantity * data.unitPrice),
    }),
    []
  );

  const WORK_CATEGORIES: WorkCategory[] = [
    '基礎工事',
    '解体工事',
    '土木工事',
    '建築工事',
    '内装工事',
    '外装工事',
    '電気工事',
    '給排水工事',
    '塗装工事',
    'その他',
  ];

  return {
    ...state,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addPriceMasterItem,
    updatePriceMasterItem,
    deletePriceMasterItem,
    addEstimate,
    updateEstimate,
    deleteEstimate,
    updateEstimateStatus,
    createLineItem,
    WORK_CATEGORIES,
  };
}

export type UseAppStore = ReturnType<typeof useAppStore>;
