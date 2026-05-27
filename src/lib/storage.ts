import { DEFAULT_COMPANY, type CompanyProfile, type Invoice } from "@/types/invoice";
import { seedInvoice } from "./seed";
import { findOrCreateUser, updateUserStats, addServiceHistory } from "./storage-phone";
import { calcTotals } from "./calc";

const INV_KEY = "cp_invoices_v1";
const COMP_KEY = "cp_company_v1";
const SEED_KEY = "cp_seeded_v1";

export const loadCompany = (): CompanyProfile => {
  try {
    const raw = localStorage.getItem(COMP_KEY);
    if (raw) return { ...DEFAULT_COMPANY, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_COMPANY;
};

export const saveCompany = (c: CompanyProfile) => {
  localStorage.setItem(COMP_KEY, JSON.stringify(c));
};

export const loadInvoices = (): Invoice[] => {
  try {
    if (!localStorage.getItem(SEED_KEY)) {
      const company = loadCompany();
      const seed = seedInvoice(company);
      localStorage.setItem(INV_KEY, JSON.stringify([seed]));
      localStorage.setItem(SEED_KEY, "1");
      return [seed];
    }
    const raw = localStorage.getItem(INV_KEY);
    const list = raw ? (JSON.parse(raw) as Invoice[]) : [];
    // Backward compatibility: add companyType if missing
    list.forEach(inv => {
      if (!inv.companyType) {
        inv.companyType = 'circle-pair';
      }
    });
    return list;
  } catch {
    return [];
  }
};

export const saveInvoices = (list: Invoice[]) => {
  localStorage.setItem(INV_KEY, JSON.stringify(list));
};

export const upsertInvoice = (inv: Invoice) => {
  const list = loadInvoices();
  const i = list.findIndex((x) => x.id === inv.id);
  const isNew = i < 0;

  if (i >= 0) list[i] = inv;
  else list.unshift(inv);
  saveInvoices(list);

  // Update user stats and history for new invoices
  if (isNew && inv.customer.phone) {
    const user = findOrCreateUser(inv.customer.name, inv.customer.phone);
    updateUserStats(user.id, 'service');

    const totals = calcTotals(inv);
    addServiceHistory(
      user.id,
      inv.id,
      inv.number,
      'service',
      inv.date,
      inv.device.type || 'Unknown',
      totals.grandTotal,
      inv.status
    );
  }

  return list;
};

export const deleteInvoice = (id: string) => {
  const list = loadInvoices().filter((x) => x.id !== id);
  saveInvoices(list);
  return list;
};

export const getInvoice = (id: string) =>
  loadInvoices().find((x) => x.id === id) || null;
