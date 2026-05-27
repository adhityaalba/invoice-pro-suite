import { DEFAULT_COMPANY, type CompanyProfile } from "@/types/invoice";

const COMP_KEY = "cp_company_v1";

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
