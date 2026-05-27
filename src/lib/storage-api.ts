// Storage layer using PostgreSQL API instead of localStorage
// This replaces localStorage with database calls

import { usersApi, circlePairApi, circlePhoneApi } from './api-client';
import type { Invoice } from '@/types/invoice';
import type { CirclePhoneInvoice } from '@/types/circle-phone';
import type { UserProfile } from '@/types/user';

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

export async function findOrCreateUser(name: string, phone: string): Promise<UserProfile> {
  try {
    const existing = await usersApi.getByPhone(phone);

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        email: existing.email || '',
        address: existing.address || '',
        instagram: existing.instagram || '',
        notes: existing.notes || '',
        totalServices: existing.total_services || 0,
        totalPurchases: existing.total_purchases || 0,
        lastVisit: existing.last_visit || '',
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    const created = await usersApi.create({ name, phone });
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

function mapDbInvoiceToApp(db: any): Invoice {
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
    items: (db.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      qty: item.qty,
      unitPrice: item.unit_price,
      discount: item.discount,
      tax: item.tax_percent,
    })),
    payment: {
      downPayment: db.down_payment,
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
  return {
    id: app.id,
    number: app.number,
    customerId: null, // Will be resolved from phone
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
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 0,
    downPayment: app.payment.downPayment,
    remainingAmount: 0,
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

    return await loadPhoneInvoices();
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
    deviceModel: '',
    deviceStorage: '',
    deviceColor: '',
    deviceImei: '',
    deviceCondition: '',
    items: (db.items || []).map((item: any) => ({
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
    })),
    payment: {
      downPayment: db.down_payment,
      tradeInValue: db.trade_in_value,
      remaining: db.remaining_amount,
      method: db.payment_method || '',
      notes: db.payment_notes || '',
    },
    tradeIn: db.trade_in || undefined,
    notes: db.notes || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapAppPhoneInvoiceToDb(app: CirclePhoneInvoice): any {
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
    subtotal: 0,
    downPayment: app.payment.downPayment,
    tradeInValue: app.payment.tradeInValue,
    remainingAmount: app.payment.remaining,
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
