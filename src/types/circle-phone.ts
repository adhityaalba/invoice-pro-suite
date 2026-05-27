// Circle Phone - Sales & Trade-in types

export type SalesStatus = 'draft' | 'paid' | 'unpaid' | 'partial' | 'reserved' | 'delivered';

export interface TradeInDevice {
  model: string;
  storage: string;
  color: string;
  imei: string;
  condition: 'mulus' | 'lecet' | 'amat_lecet' | 'batangan_fisik' | 'mati_total' | 'lcd_retak' | 'lcd_bermasalah';
  estimatedPrice: number;
  notes?: string;
}

export interface SalesItem {
  id: string;
  itemType: 'device' | 'accessory';
  name: string;
  description?: string;
  qty: number;
  unitPrice: number;
  discount: number;
  // Device-specific fields
  imei?: string;
  storage?: string;
  color?: string;
  condition?: string;
}

export interface SalesPayment {
  downPayment: number;
  tradeInValue: number;
  remaining: number;
  method: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  instagram?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CirclePhoneInvoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string; // denormalized for easy access
  customerPhone: string;
  customerEmail?: string;
  customerInstagram?: string;
  customerAddress?: string;
  date: string;
  dueDate: string;
  status: SalesStatus;

  // Device being sold
  deviceModel: string;
  deviceStorage: string;
  deviceColor: string;
  deviceImei: string;
  deviceCondition: string;

  // Trade-in device (optional)
  tradeIn?: TradeInDevice;

  items: SalesItem[];
  payment: SalesPayment;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const CONDITION_LABELS: Record<string, string> = {
  mulus: 'Mulus (Seperti Baru)',
  lecet: 'Lecet Pemakaian Wajar',
  amat_lecet: 'Amat Lecet',
  batangan_fisik: 'Batangan Fisik (Minus)',
  mati_total: 'Mati Total',
  lcd_retak: 'LCD Retak',
  lcd_bermasalah: 'LCD Bermasalah (Touchscreen)',
};

export const BLANK_SALES_ITEM = {
  id: '',
  itemType: 'device' as const,
  name: '',
  description: '',
  qty: 1,
  unitPrice: 0,
  discount: 0,
  imei: '',
  storage: '',
  color: '',
  condition: '',
};

export const BLANK_TRADE_IN: TradeInDevice = {
  model: '',
  storage: '',
  color: '',
  imei: '',
  condition: 'lecet',
  estimatedPrice: 0,
  notes: '',
};
