import {
  DEFAULT_TERMS_GENERAL,
  DEFAULT_TERMS_WARRANTY,
  type CompanyProfile,
  type Invoice,
} from "@/types/invoice";
import { newId, todayISO } from "./format";

export const newInvoiceNumber = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.floor(100 + Math.random() * 900);
  return `CP-${ymd}-${rnd}`;
};

export const blankInvoice = (company: CompanyProfile): Invoice => ({
  id: newId(),
  number: newInvoiceNumber(),
  date: todayISO(),
  dueDate: todayISO(),
  status: "draft",
  documentType: "service_order",
  customer: { name: "", phone: "", email: "", address: "", pin: "", notes: "" },
  device: { type: "", storage: "", color: "", imei: "", complaint: "", diagnosis: "", warrantyStatus: "Non-Garansi" },
  items: [
    { id: newId(), name: "", description: "", qty: 1, unitPrice: 0, discount: 0, tax: 0 },
  ],
  payment: { downPayment: 0, method: "Transfer Bank", notes: "" },
  signatures: {},
  notes: "",
  terms: { warranty: company.defaultTermsWarranty || DEFAULT_TERMS_WARRANTY, general: company.defaultTermsGeneral || DEFAULT_TERMS_GENERAL },
  templateSettings: {
    theme: "dark",
    brandColor: company.brandColor,
    showQr: true,
    showPin: true,
    showDeviceTable: true,
    font: "Inter",
  },
  company,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const seedInvoice = (company: CompanyProfile): Invoice => {
  const inv = blankInvoice(company);
  inv.number = "CP-DEMO-001";
  inv.status = "partial";
  inv.documentType = "service_order";
  inv.customer = {
    name: "Andi Pratama",
    phone: "+62 813-9988-7766",
    email: "andi.pratama@email.com",
    address: "Jl. Sudirman Kav. 21, Jakarta",
    pin: "1234",
    notes: "Customer minta dihubungi via WhatsApp",
  };
  inv.device = {
    type: "iPhone 13 Pro",
    storage: "256 GB",
    color: "Sierra Blue",
    imei: "356789102345678",
    complaint: "LCD pecah, touch tidak respon di bagian bawah",
    diagnosis: "Ganti LCD original + tempered glass",
    warrantyStatus: "Garansi 30 Hari",
  };
  inv.items = [
    { id: newId(), name: "Penggantian LCD iPhone 13 Pro (Original)", description: "Termasuk pemasangan & QC", qty: 1, unitPrice: 3500000, discount: 100000, tax: 0 },
    { id: newId(), name: "Tempered Glass Premium", description: "Anti gores 9H", qty: 1, unitPrice: 150000, discount: 0, tax: 0 },
    { id: newId(), name: "Biaya Jasa Service", description: "Cleaning & kalibrasi", qty: 1, unitPrice: 250000, discount: 0, tax: 0 },
  ];
  inv.payment = { downPayment: 2000000, method: "Transfer BCA", notes: "DP sudah masuk 18 Mei 2026" };
  inv.signatures = {
    customerInDate: todayISO(),
    companyInDate: todayISO(),
  };
  return inv;
};
