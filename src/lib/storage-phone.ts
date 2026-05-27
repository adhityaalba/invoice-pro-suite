import { newId, todayISO } from './format';
import type { CirclePhoneInvoice } from '@/types/circle-phone';
import { BLANK_SALES_ITEM } from '@/types/circle-phone';

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
  customerEmail: '',
  customerInstagram: '',
  customerAddress: '',
  date: todayISO(),
  dueDate: todayISO(),
  status: 'draft',
  deviceModel: '',
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
