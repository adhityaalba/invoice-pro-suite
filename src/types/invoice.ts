export type InvoiceStatus = "draft" | "paid" | "unpaid" | "partial";
export type DocumentType = "invoice" | "service_order";

export interface CompanyProfile {
  name: string;
  tagline?: string;
  logo?: string; // dataURL
  email: string;
  phone: string;
  address: string;
  brandColor: string; // hex
  qrImage?: string;
  paymentMethods: string;
  defaultTermsWarranty: string;
  defaultTermsGeneral: string;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  address: string;
  pin?: string;
  notes?: string;
}

export interface Device {
  type: string;
  storage: string;
  color: string;
  imei: string;
  complaint?: string;
  diagnosis?: string;
  warrantyStatus?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  qty: number;
  unitPrice: number;
  discount: number; // absolute
  tax: number; // percent
}

export interface Payment {
  downPayment: number;
  method: string;
  notes?: string;
}

export interface Signatures {
  customerSignature?: string; // dataURL
  companySignature?: string;
  customerInDate?: string;
  customerOutDate?: string;
  companyInDate?: string;
  companyOutDate?: string;
}

export interface TemplateSettings {
  theme: "dark" | "light";
  brandColor: string;
  showQr: boolean;
  showPin: boolean;
  showDeviceTable: boolean;
  font: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string; // ISO
  dueDate: string;
  status: InvoiceStatus;
  documentType: DocumentType;
  customer: Customer;
  device: Device;
  items: InvoiceItem[];
  payment: Payment;
  signatures: Signatures;
  notes?: string;
  terms: { warranty: string; general: string };
  templateSettings: TemplateSettings;
  company: CompanyProfile;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TERMS_WARRANTY = `1. Garansi berlaku 30 hari sejak tanggal service untuk kerusakan yang sama.
2. Garansi hangus apabila terdapat segel rusak, bekas dibongkar pihak lain, atau terkena cairan/benturan.
3. Garansi tidak meliputi software, aplikasi, dan data pengguna.
4. Bawa nota/invoice ini saat klaim garansi.`;

export const DEFAULT_TERMS_GENERAL = `1. Pengambilan unit wajib membawa nota/invoice asli ini.
2. Unit yang tidak diambil dalam 30 hari setelah selesai service di luar tanggung jawab kami.
3. Data pengguna sepenuhnya tanggung jawab customer, mohon backup terlebih dahulu.
4. Pembayaran sah setelah dana diterima penuh.
5. Dengan menandatangani dokumen ini, customer menyetujui seluruh syarat & ketentuan.`;

export const DEFAULT_COMPANY: CompanyProfile = {
  name: "Circle Pair",
  tagline: "Gadget Service & Repair",
  email: "hello@circlepair.id",
  phone: "+62 812-3456-7890",
  address: "Jl. Merdeka No. 12, Jakarta Pusat",
  brandColor: "#F5A623",
  paymentMethods: "BCA 1234567890 a.n. Circle Pair\nDANA / OVO / GoPay: 081234567890",
  defaultTermsWarranty: DEFAULT_TERMS_WARRANTY,
  defaultTermsGeneral: DEFAULT_TERMS_GENERAL,
};
