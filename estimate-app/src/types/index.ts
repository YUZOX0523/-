// 顧客
export interface Customer {
  id: string;
  name: string;
  nameKana: string;
  postalCode: string;
  address: string;
  phone: string;
  fax?: string;
  email?: string;
  contactPerson: string;
  createdAt: string;
  updatedAt: string;
}

// 工事種別
export type WorkCategory =
  | '基礎工事'
  | '解体工事'
  | '土木工事'
  | '建築工事'
  | '内装工事'
  | '外装工事'
  | '電気工事'
  | '給排水工事'
  | '塗装工事'
  | 'その他';

// 工事単価マスタ
export interface PriceMasterItem {
  id: string;
  category: WorkCategory;
  name: string;
  unit: string;
  unitPrice: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// 見積明細行
export interface EstimateLineItem {
  id: string;
  category: WorkCategory;
  name: string;
  spec?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note?: string;
}

// 見積ステータス
export type EstimateStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered';

export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: '作成中',
  submitted: '提出済',
  approved: '承認済',
  rejected: '失注',
  ordered: '受注',
};

export const ESTIMATE_STATUS_COLORS: Record<EstimateStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  ordered: 'bg-yellow-100 text-yellow-700',
};

// 見積書
export interface Estimate {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName: string;
  projectName: string;
  projectLocation: string;
  estimateDate: string;
  validUntil: string;
  constructionStartDate?: string;
  constructionEndDate?: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  note?: string;
  status: EstimateStatus;
  createdAt: string;
  updatedAt: string;
}

// アプリ全体の状態型
export interface AppState {
  customers: Customer[];
  priceMasterItems: PriceMasterItem[];
  estimates: Estimate[];
  nextEstimateSeq: number;
}
