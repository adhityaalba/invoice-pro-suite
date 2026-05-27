// User/Customer types - unified across Circle Pair and Circle Phone

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  instagram?: string;
  notes?: string;
  totalServices: number;
  totalPurchases: number;
  lastVisit: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHistory {
  id: string;
  userId: string;
  invoiceId: string;
  invoiceNumber: string;
  type: 'service' | 'sales';
  date: string;
  deviceModel: string;
  amount: number;
  status: string;
}

export const BLANK_USER: UserProfile = {
  id: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  instagram: '',
  notes: '',
  totalServices: 0,
  totalPurchases: 0,
  lastVisit: '',
  createdAt: '',
  updatedAt: '',
};
