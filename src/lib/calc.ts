import type { Invoice, InvoiceItem } from "@/types/invoice";

export const itemSubtotal = (i: InvoiceItem) => {
  const gross = (i.qty || 0) * (i.unitPrice || 0);
  const afterDisc = Math.max(0, gross - (i.discount || 0));
  const withTax = afterDisc + (afterDisc * (i.tax || 0)) / 100;
  return Math.round(withTax);
};

export const calcTotals = (inv: Pick<Invoice, "items" | "payment">) => {
  const subtotal = inv.items.reduce(
    (s, i) => s + (i.qty || 0) * (i.unitPrice || 0),
    0
  );
  const discountTotal = inv.items.reduce((s, i) => s + (i.discount || 0), 0);
  const taxTotal = inv.items.reduce((s, i) => {
    const base = Math.max(0, (i.qty || 0) * (i.unitPrice || 0) - (i.discount || 0));
    return s + (base * (i.tax || 0)) / 100;
  }, 0);
  const grandTotal = Math.round(subtotal - discountTotal + taxTotal);
  const downPayment = inv.payment?.downPayment || 0;
  const remaining = Math.max(0, grandTotal - downPayment);
  return { subtotal, discountTotal, taxTotal, grandTotal, downPayment, remaining };
};
