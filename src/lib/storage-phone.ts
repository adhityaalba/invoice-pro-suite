// Storage for Circle Phone (Sales) and Users

import { newId, todayISO } from './format';
import type { CirclePhoneInvoice } from '@/types/circle-phone';
import type { UserProfile, ServiceHistory } from '@/types/user';
import { BLANK_SALES_ITEM, BLANK_TRADE_IN } from '@/types/circle-phone';

const PHONE_INV_KEY = 'cp_phone_invoices_v1';
const USERS_KEY = 'cp_users_v1';
const HISTORY_KEY = 'cp_service_history_v1';
const PHONE_SEED_KEY = 'cp_phone_seeded_v1';

// ===== Circle Phone Invoice Storage =====

export const loadPhoneInvoices = (): CirclePhoneInvoice[] => {
  try {
    const raw = localStorage.getItem(PHONE_INV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePhoneInvoices = (list: CirclePhoneInvoice[]) => {
  localStorage.setItem(PHONE_INV_KEY, JSON.stringify(list));
};

export const upsertPhoneInvoice = (inv: CirclePhoneInvoice): CirclePhoneInvoice[] => {
  const list = loadPhoneInvoices();
  const i = list.findIndex((x) => x.id === inv.id);
  if (i >= 0) {
    list[i] = { ...inv, updatedAt: new Date().toISOString() };
  } else {
    list.unshift({ ...inv, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  savePhoneInvoices(list);
  return list;
};

export const deletePhoneInvoice = (id: string): CirclePhoneInvoice[] => {
  const list = loadPhoneInvoices().filter((x) => x.id !== id);
  savePhoneInvoices(list);
  return list;
};

export const getPhoneInvoice = (id: string) =>
  loadPhoneInvoices().find((x) => x.id === id) || null;

// ===== User Storage =====

export const loadUsers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveUsers = (list: UserProfile[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
};

export const findOrCreateUser = (name: string, phone: string): UserProfile => {
  const users = loadUsers();
  let user = users.find((u) => u.phone === phone);

  if (!user) {
    user = {
      id: newId(),
      name,
      phone,
      email: '',
      address: '',
      instagram: '',
      notes: '',
      totalServices: 0,
      totalPurchases: 0,
      lastVisit: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.unshift(user);
  } else {
    // Update existing user
    user = {
      ...user,
      name: name || user.name,
      lastVisit: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = users.findIndex((u) => u.id === user.id);
    users[idx] = user;
  }

  saveUsers(users);
  return user;
};

export const updateUserStats = (
  userId: string,
  type: 'service' | 'sales'
): UserProfile | null => {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;

  if (type === 'service') {
    users[idx].totalServices += 1;
  } else {
    users[idx].totalPurchases += 1;
  }
  users[idx].updatedAt = new Date().toISOString();

  saveUsers(users);
  return users[idx];
};

export const getUserByPhone = (phone: string): UserProfile | null => {
  const users = loadUsers();
  return users.find((u) => u.phone === phone) || null;
};

export const getUserById = (id: string): UserProfile | null => {
  const users = loadUsers();
  return users.find((u) => u.id === id) || null;
};

// ===== Service History Storage =====

export const loadServiceHistory = (): ServiceHistory[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveServiceHistory = (list: ServiceHistory[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
};

export const addServiceHistory = (
  userId: string,
  invoiceId: string,
  invoiceNumber: string,
  type: 'service' | 'sales',
  date: string,
  deviceModel: string,
  amount: number,
  status: string
): void => {
  const history = loadServiceHistory();
  history.unshift({
    id: newId(),
    userId,
    invoiceId,
    invoiceNumber,
    type,
    date,
    deviceModel,
    amount,
    status,
  });
  saveServiceHistory(history);
};

export const getUserHistory = (userId: string): ServiceHistory[] => {
  const history = loadServiceHistory();
  return history.filter((h) => h.userId === userId);
};

// ===== Combined Functions =====

export const getUserCompleteProfile = (phone: string): {
  user: UserProfile | null;
  serviceHistory: ServiceHistory[];
  circlePairCount: number;
  circlePhoneCount: number;
} => {
  const user = getUserByPhone(phone);
  if (!user) {
    return {
      user: null,
      serviceHistory: [],
      circlePairCount: 0,
      circlePhoneCount: 0,
    };
  }

  const history = getUserHistory(user.id);
  const circlePairCount = history.filter((h) => h.type === 'service').length;
  const circlePhoneCount = history.filter((h) => h.type === 'sales').length;

  return {
    user,
    serviceHistory: history,
    circlePairCount,
    circlePhoneCount,
  };
};

// ===== Circle Phone Invoice Helpers =====

export const newSalesNumber = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.floor(100 + Math.random() * 900);
  return `CPH-${ymd}-${rnd}`;
};

export const blankPhoneInvoice = (): CirclePhoneInvoice => ({
  id: newId(),
  number: newSalesNumber(),
  customerId: '',
  customerName: '',
  customerPhone: '',
  date: todayISO(),
  dueDate: todayISO(),
  status: 'draft',
  deviceModel: '', // Kept for compatibility, will be derived from first device item
  deviceStorage: '',
  deviceColor: '',
  deviceImei: '',
  deviceCondition: '',
  items: [{ ...BLANK_SALES_ITEM, id: newId() }],
  payment: {
    downPayment: 0,
    tradeInValue: 0,
    remaining: 0,
    method: 'Transfer Bank',
    notes: '',
  },
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
