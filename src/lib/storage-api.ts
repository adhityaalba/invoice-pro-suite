// Storage layer using PostgreSQL API instead of localStorage
// This replaces localStorage with database calls

import { usersApi, circlePairApi, circlePhoneApi } from './api-client';
import type { Invoice } from '@/types/invoice';
import type { CirclePhoneInvoice } from '@/types/circle-phone';
import type { UserProfile } from '@/types/user';
import { calcTotals } from './calc';

// ============================================
// USERS
// ============================================

export async function loadUsers(): Promise<UserProfile[]> {
  try {
    const data = await usersApi.list();
    return data.map((u: any) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email || '',
      address: u.address || '',
      instagram: u.instagram || '',
      notes: u.notes || '',
      totalServices: u.total_services || 0,
      totalPurchases: u.total_purchases || 0,
      lastVisit: u.last_visit || '',
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
}

export async function findOrCreateUser(name: string, phone: string, extra?: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const payload = {
      name,
      phone,
      email: extra?.email || undefined,
      address: extra?.address || undefined,
      instagram: extra?.instagram || undefined,
      notes: extra?.notes || undefined,
    };

    const created = await usersApi.create(payload);
    return {
      id: created.id,
      name: created.name,
      phone: created.phone,
      email: created.email || '',
      address: created.address || '',
      instagram: created.instagram || '',
      notes: created.notes || '',
      totalServices: created.total_services || 0,
      totalPurchases: created.total_purchases || 0,
      lastVisit: created.last_visit || '',
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  } catch (error) {
    console.error('Failed to find/create user:', error);
    throw error;
  }
}

export async function getUserByPhone(phone: string): Promise<UserProfile | null> {
  try {
    const user = await usersApi.getByPhone(phone);
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email || '',
      address: user.address || '',
      instagram: user.instagram || '',
      notes: user.notes || '',
      totalServices: user.total_services || 0,
      totalPurchases: user.total_purchases || 0,
      lastVisit: user.last_visit || '',
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch (error) {
    console.error('Failed to get user by phone:', error);
    return null;
  }
}

// ============================================
// CIRCLE PAIR (Service)
// ============================================

export async function loadInvoices(): Promise<Invoice[]> {
  try {
    const data = await circlePairApi.list();
    return data.map((inv: any) => mapDbInvoiceToApp(inv));
  } catch (error) {
    console.error('Failed to load invoices:', error);
    return [];
  }
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  try {
    const data = await circlePairApi.getById(id);
    if (!data) return null;
    return mapDbInvoiceToApp(data);
  } catch (error) {
    console.error('Failed to get invoice:', error);
    return null;
  }
}

export async function upsertInvoice(invoice: Invoice): Promise<Invoice[]> {
  try {
    const dbData = mapAppInvoiceToDb(invoice);

    if (invoice.id && (await invoiceExists(invoice.id))) {
      await circlePairApi.update(dbData);
    } else {
      await circlePairApi.create(dbData);
    }

    return await loadInvoices();
  } catch (error) {
    console.error('Failed to upsert invoice:', error);
    throw error;
  }
}

export async function deleteInvoice(id: string): Promise<Invoice[]> {
  try {
    await circlePairApi.delete(id);
    return await loadInvoices();
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    throw error;
  }
}

async function invoiceExists(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  try {
    await circlePairApi.getById(id);
    return true;
  } catch {
    return false;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapDbInvoiceToApp(db: any): Invoice {
  const items =
    db.items !== undefined
      ? db.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          qty: item.qty,
          unitPrice: item.unit_price,
          discount: item.discount,
          tax: item.tax_percent,
        }))
      : [
          {
            id: 'dummy',
            name: 'Service Charge',
            description: 'Layanan perbaikan gadget',
            qty: 1,
            unitPrice: db.grand_total || 0,
            discount: 0,
            tax: 0,
          },
        ];

  return {
    id: db.id,
    number: db.number,
    date: db.date,
    dueDate: db.due_date,
    status: db.status,
    documentType: db.document_type,
    companyType: 'circle-pair',
    customer: {
      name: db.customer_name,
      phone: db.customer_phone,
      email: db.customer_email || '',
      address: db.customer_address || '',
      pin: db.customer_pin || '',
      notes: db.customer_notes || '',
    },
    device: {
      type: db.device_type || '',
      storage: db.device_storage || '',
      color: db.device_color || '',
      imei: db.device_imei || '',
      complaint: db.device_complaint || '',
      diagnosis: db.device_diagnosis || '',
      warrantyStatus: db.device_warranty_status || '',
    },
    items,
    payment: {
      downPayment: db.down_payment || 0,
      method: '',
      notes: '',
    },
    signatures: db.signatures || {
      customerSignature: '',
      companySignature: '',
      customerInDate: '',
      customerOutDate: '',
      companyInDate: '',
      companyOutDate: '',
    },
    notes: db.notes || '',
    terms: {
      warranty: db.terms_warranty || '',
      general: db.terms_general || '',
    },
    templateSettings: db.template_settings || {
      theme: 'dark',
      brandColor: '#F5A623',
      showQr: true,
      showPin: true,
      showDeviceTable: true,
      font: 'Inter',
    },
    company: {
      name: db.company_name || 'Circle Pair',
      tagline: 'Gadget Service & Repair',
      email: db.company_email || '',
      phone: db.company_phone || '',
      address: db.company_address || '',
      brandColor: '#F5A623',
      paymentMethods: '',
      defaultTermsWarranty: '',
      defaultTermsGeneral: '',
    },
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapAppInvoiceToDb(app: Invoice): any {
  const totals = calcTotals(app);
  return {
    id: app.id,
    number: app.number,
    customerId: app.customerId || null,
    customerName: app.customer.name,
    customerPhone: app.customer.phone,
    customerEmail: app.customer.email || null,
    customerAddress: app.customer.address || null,
    customerPin: app.customer.pin || null,
    customerNotes: app.customer.notes || null,
    deviceType: app.device.type,
    deviceStorage: app.device.storage,
    deviceColor: app.device.color,
    deviceImei: app.device.imei,
    deviceComplaint: app.device.complaint,
    deviceDiagnosis: app.device.diagnosis,
    deviceWarrantyStatus: app.device.warrantyStatus,
    date: app.date,
    dueDate: app.dueDate,
    status: app.status,
    documentType: app.documentType,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    downPayment: totals.downPayment,
    remainingAmount: totals.remaining,
    notes: app.notes,
    termsWarranty: app.terms.warranty,
    termsGeneral: app.terms.general,
    templateSettings: app.templateSettings,
    companyName: app.company.name,
    companyEmail: app.company.email,
    companyPhone: app.company.phone,
    companyAddress: app.company.address,
    items: app.items.map((item) => ({
      name: item.name,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
    })),
    signatures: {
      customerSignature: app.signatures.customerSignature,
      companySignature: app.signatures.companySignature,
      customerInDate: app.signatures.customerInDate,
      customerOutDate: app.signatures.customerOutDate,
      companyInDate: app.signatures.companyInDate,
      companyOutDate: app.signatures.companyOutDate,
    },
  };
}

// ============================================
// CIRCLE PHONE (Sales)
// ============================================

export async function loadPhoneInvoices(): Promise<CirclePhoneInvoice[]> {
  try {
    const data = await circlePhoneApi.list();
    return data.map((inv: any) => mapDbPhoneInvoiceToApp(inv));
  } catch (error) {
    console.error('Failed to load phone invoices:', error);
    return [];
  }
}

export async function getPhoneInvoice(id: string): Promise<CirclePhoneInvoice | null> {
  try {
    const data = await circlePhoneApi.getById(id);
    if (!data) return null;
    return mapDbPhoneInvoiceToApp(data);
  } catch (error) {
    console.error('Failed to get phone invoice:', error);
    return null;
  }
}

export async function upsertPhoneInvoice(invoice: CirclePhoneInvoice): Promise<CirclePhoneInvoice[]> {
  try {
    const dbData = mapAppPhoneInvoiceToDb(invoice);

    if (invoice.id && (await phoneInvoiceExists(invoice.id))) {
      await circlePhoneApi.update(dbData);
    } else {
      await circlePhoneApi.create(dbData);
    }

    const [list, saved] = await Promise.all([loadPhoneInvoices(), getPhoneInvoice(invoice.id)]);

    if (!saved) {
      return list;
    }

    return [saved, ...list.filter((row) => row.id !== saved.id)];
  } catch (error) {
    console.error('Failed to upsert phone invoice:', error);
    throw error;
  }
}

export async function deletePhoneInvoice(id: string): Promise<CirclePhoneInvoice[]> {
  try {
    await circlePhoneApi.delete(id);
    return await loadPhoneInvoices();
  } catch (error) {
    console.error('Failed to delete phone invoice:', error);
    throw error;
  }
}

async function phoneInvoiceExists(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  try {
    await circlePhoneApi.getById(id);
    return true;
  } catch {
    return false;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapDbPhoneInvoiceToApp(db: any): CirclePhoneInvoice {
  const rawTradeIn = db.tradeIn || db.trade_in || null;
  const mappedTradeIn = rawTradeIn
    ? {
        model: rawTradeIn.model || '',
        storage: rawTradeIn.storage || '',
        color: rawTradeIn.color || '',
        imei: rawTradeIn.imei || '',
        condition: rawTradeIn.condition || 'lecet',
        estimatedPrice: rawTradeIn.estimatedPrice ?? rawTradeIn.estimated_price ?? 0,
        notes: rawTradeIn.notes || '',
      }
    : undefined;

  const items =
    db.items !== undefined
      ? db.items.map((item: any) => ({
          id: item.id,
          itemType: item.item_type,
          name: item.name,
          description: item.description || '',
          qty: item.qty,
          unitPrice: item.unit_price,
          discount: item.discount,
          imei: item.imei || '',
          storage: item.storage || '',
          color: item.color || '',
          condition: item.condition || '',
        }))
      : [
          {
            id: 'dummy',
            itemType: 'device' as const,
            name: 'Sales Device',
            qty: 1,
            unitPrice: db.subtotal || 0,
            discount: 0,
            imei: '',
            storage: '',
            color: '',
            condition: '',
          },
        ];

  const deviceItem = items.find((i: any) => i.itemType === 'device') || items[0];

  return {
    id: db.id,
    number: db.number,
    customerId: db.customer_id || '',
    customerName: db.customer_name,
    customerPhone: db.customer_phone,
    customerEmail: db.customer_email || '',
    customerAddress: db.customer_address || '',
    customerInstagram: db.customer_instagram || '',
    date: db.date,
    dueDate: db.due_date,
    status: db.status,
    deviceModel: deviceItem?.name || '',
    deviceStorage: deviceItem?.storage || '',
    deviceColor: deviceItem?.color || '',
    deviceImei: deviceItem?.imei || '',
    deviceCondition: deviceItem?.condition || '',
    items,
    payment: {
      downPayment: db.down_payment || 0,
      tradeInValue: db.trade_in_value || 0,
      remaining: db.remaining_amount || 0,
      method: db.payment_method || '',
      notes: db.payment_notes || '',
    },
    tradeIn: mappedTradeIn,
    notes: db.notes || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapAppPhoneInvoiceToDb(app: CirclePhoneInvoice): any {
  const subtotal = app.items.reduce((sum, item) => sum + (item.qty * item.unitPrice - item.discount), 0);
  const remaining = Math.max(0, subtotal - app.payment.downPayment - (app.payment.tradeInValue || 0));

  return {
    id: app.id,
    number: app.number,
    customerId: app.customerId || null,
    customerName: app.customerName,
    customerPhone: app.customerPhone,
    customerEmail: app.customerEmail || null,
    customerAddress: app.customerAddress || null,
    customerInstagram: app.customerInstagram || null,
    date: app.date,
    dueDate: app.dueDate,
    status: app.status,
    subtotal: subtotal,
    downPayment: app.payment.downPayment,
    tradeInValue: app.payment.tradeInValue,
    remainingAmount: remaining,
    paymentMethod: app.payment.method,
    paymentNotes: app.payment.notes,
    notes: app.notes,
    items: app.items.map((item) => ({
      itemType: item.itemType,
      name: item.name,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount,
      imei: item.imei || null,
      storage: item.storage || null,
      color: item.color || null,
      condition: item.condition || null,
    })),
    tradeIn: app.tradeIn || null,
  };
}

// Stubs for functions that would be handled by the backend
export function saveCompany() {
  return Promise.resolve();
}
export function loadCompany() {
  return Promise.resolve(null);
}
export function updateUserStats() {
  return Promise.resolve(null);
}
export function addServiceHistory() {
  return Promise.resolve();
}
export function getUserHistory() {
  return Promise.resolve([]);
}
export function getUserCompleteProfile() {
  return Promise.resolve({ user: null, serviceHistory: [], circlePairCount: 0, circlePhoneCount: 0 });
}
