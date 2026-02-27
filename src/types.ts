export type UserRole = 'PATIENT' | 'ADMIN' | 'DOCTOR' | 'PARTNER';

export interface User {
  id: number;
  phone: string;
  email?: string;
  role: UserRole;
  name: string;
  referral_code: string;
  upline_id?: number;
  created_at: string;
}

export interface Wallet {
  id: number;
  name: string;
  balance: number;
  user_id: number;
}

export interface WalletHistoryEntry {
  id: number;
  transaction_id: number;
  account_id: number;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
  loyalty_rate: number;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name?: string;
  doctor_id: number;
  service_id: number;
  service_name?: string;
  start_time: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
}

export interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  outstandingLiability: number;
  recentAppts: Appointment[];
}

export interface Partner {
  id: number;
  user_id: number;
  owner_name?: string;
  company_name: string;
  tax_id: string;
  type: 'HOTEL' | 'RESTAURANT' | 'CORPORATION';
  city: string;
  unique_code: string;
  commission_rate: number;
  status: string;
}
