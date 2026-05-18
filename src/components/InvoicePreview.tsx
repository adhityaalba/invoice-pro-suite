import type { Invoice } from "@/types/invoice";
import { calcTotals } from "@/lib/calc";
import { formatDateID, formatRupiah } from "@/lib/format";
import { Mail, Phone, MapPin, StickyNote, Wallet, FileText } from "lucide-react";

interface Props {
  invoice: Invoice;
}

export default function InvoicePreview({ invoice }: Props) {
  const { grandTotal, downPayment, remaining, subtotal, discountTotal, taxTotal } = calcTotals(invoice);
  const brand = invoice.templateSettings.brandColor || invoice.company.brandColor;
  const ts = invoice.templateSettings;
  const c = invoice.company;
  const showQr = ts.showQr && c.qrImage;

  return (
    <div
      className="invoice-print-root mx-auto w-full max-w-[210mm] overflow-hidden rounded-xl shadow-2xl"
      style={{ background: "hsl(var(--doc-bg))", color: "hsl(var(--doc-foreground))", aspectRatio: "210 / 297", minHeight: "297mm" }}
    >
      <div className="grid h-full" style={{ gridTemplateColumns: "30% 70%" }}>
        {/* SIDEBAR */}
        <aside className="flex h-full flex-col gap-4 p-5" style={{ background: "hsl(var(--doc-surface))" }}>
          <div className="flex flex-col items-start gap-2">
            {c.logo ? (
              <img src={c.logo} alt={c.name} className="h-16 w-auto max-w-[150px] object-contain" />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full font-bold text-lg"
                style={{ background: brand, color: "#111" }}
              >
                {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-bold leading-tight" style={{ color: brand }}>{c.name}</div>
              {c.tagline && <div className="text-[10px] doc-muted uppercase tracking-wider">{c.tagline}</div>}
            </div>
          </div>

          <Section title="Contact" brand={brand}>
            <Row icon={<Phone className="h-3 w-3" />} text={c.phone} />
            <Row icon={<MapPin className="h-3 w-3" />} text={c.address} />
          </Section>

          <Section title="Mail" brand={brand}>
            <Row icon={<Mail className="h-3 w-3" />} text={c.email} />
          </Section>

          {invoice.notes && (
            <Section title="Notes" brand={brand}>
              <div className="text-[10px] leading-relaxed doc-muted whitespace-pre-wrap">{invoice.notes}</div>
            </Section>
          )}

          <Section title="Payment Methods" brand={brand}>
            <div className="text-[10px] leading-relaxed doc-muted whitespace-pre-wrap">{c.paymentMethods}</div>
          </Section>

          {showQr && (
            <div className="mt-auto">
              <div className="text-[10px] doc-muted mb-1 uppercase tracking-wider">Scan to Pay</div>
              <div className="rounded-md bg-white p-2 inline-block">
                <img src={c.qrImage} alt="QR" className="h-24 w-24 object-contain" />
              </div>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main className="flex h-full flex-col gap-3 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b doc-divider pb-3">
            <div>
              <div className="text-[10px] doc-muted uppercase tracking-[0.2em]">{invoice.documentType === "invoice" ? "Invoice" : "Service Order"}</div>
              <h1 className="text-2xl font-bold mt-0.5" style={{ color: brand }}>{invoice.number}</h1>
            </div>
            <div className="text-right text-[10px]">
              <div className="doc-muted uppercase tracking-wider">Tanggal</div>
              <div className="font-medium">{formatDateID(invoice.date)}</div>
              <div className="doc-muted uppercase tracking-wider mt-1">Jatuh Tempo</div>
              <div className="font-medium">{formatDateID(invoice.dueDate)}</div>
              <div className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase" style={{ background: brand, color: "#111" }}>
                {statusLabel(invoice.status)}
              </div>
            </div>
          </div>

          {/* Device Table */}
          {ts.showDeviceTable && (
            <div>
              <SectionTitle>Device</SectionTitle>
              <table className="mt-1 w-full border-collapse text-[10px]">
                <thead>
                  <tr style={{ background: "hsl(var(--doc-surface-2))" }}>
                    <Th>Type</Th><Th>Storage</Th><Th>Color</Th><Th>IMEI / SN</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t doc-divider">
                    <Td>{invoice.device.type || "-"}</Td>
                    <Td>{invoice.device.storage || "-"}</Td>
                    <Td>{invoice.device.color || "-"}</Td>
                    <Td className="font-mono">{invoice.device.imei || "-"}</Td>
                  </tr>
                </tbody>
              </table>
              {(invoice.device.complaint || invoice.device.diagnosis) && (
                <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px]">
                  {invoice.device.complaint && (
                    <div className="doc-card-2 rounded p-2">
                      <div className="doc-muted uppercase text-[9px] tracking-wider mb-0.5">Keluhan</div>
                      <div>{invoice.device.complaint}</div>
                    </div>
                  )}
                  {invoice.device.diagnosis && (
                    <div className="doc-card-2 rounded p-2">
                      <div className="doc-muted uppercase text-[9px] tracking-wider mb-0.5">Diagnosa</div>
                      <div>{invoice.device.diagnosis}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Customer & PIN */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="doc-card-2 rounded p-2 col-span-2">
              <div className="doc-muted uppercase text-[9px] tracking-wider">Customer</div>
              <div className="font-semibold text-sm">{invoice.customer.name || "-"}</div>
              <div className="doc-muted">{invoice.customer.phone}</div>
              <div className="doc-muted">{invoice.customer.address}</div>
            </div>
            <div className="grid grid-rows-2 gap-2">
              <div className="doc-card-2 rounded p-2">
                <div className="doc-muted uppercase text-[9px] tracking-wider">Email</div>
                <div className="truncate">{invoice.customer.email || "-"}</div>
              </div>
              {ts.showPin && (
                <div className="doc-card-2 rounded p-2">
                  <div className="doc-muted uppercase text-[9px] tracking-wider">PIN / Lock</div>
                  <div className="font-mono tracking-widest">{invoice.customer.pin || "—"}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <SectionTitle>Items</SectionTitle>
            <table className="mt-1 w-full border-collapse text-[10px]">
              <thead>
                <tr style={{ background: "hsl(var(--doc-surface-2))" }}>
                  <Th>Deskripsi</Th>
                  <Th className="text-center w-10">Qty</Th>
                  <Th className="text-right w-24">Harga</Th>
                  <Th className="text-right w-24">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it) => {
                  const sub = (it.qty || 0) * (it.unitPrice || 0);
                  return (
                    <tr key={it.id} className="border-t doc-divider align-top">
                      <Td>
                        <div className="font-medium">{it.name || "-"}</div>
                        {it.description && <div className="doc-muted text-[9px]">{it.description}</div>}
                      </Td>
                      <Td className="text-center">{it.qty}</Td>
                      <Td className="text-right">{formatRupiah(it.unitPrice)}</Td>
                      <Td className="text-right">{formatRupiah(sub)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-2 mt-auto text-[10px]">
            <div className="doc-card-2 rounded p-2">
              <div className="doc-muted uppercase text-[9px] tracking-wider mb-1 flex items-center gap-1"><Wallet className="h-3 w-3" /> Payment</div>
              <div className="flex justify-between"><span className="doc-muted">Metode</span><span>{invoice.payment.method}</span></div>
              {invoice.payment.notes && <div className="doc-muted mt-1 text-[9px]">{invoice.payment.notes}</div>}
            </div>
            <div className="rounded p-2" style={{ background: brand, color: "#111" }}>
              <table className="w-full text-[10px]">
                <tbody>
                  <tr><td>Subtotal</td><td className="text-right">{formatRupiah(subtotal)}</td></tr>
                  {discountTotal > 0 && <tr><td>Diskon</td><td className="text-right">-{formatRupiah(discountTotal)}</td></tr>}
                  {taxTotal > 0 && <tr><td>Pajak</td><td className="text-right">{formatRupiah(taxTotal)}</td></tr>}
                  <tr className="font-bold border-t border-black/30"><td className="pt-1">Grand Total</td><td className="text-right pt-1">{formatRupiah(grandTotal)}</td></tr>
                  <tr><td>Down Payment</td><td className="text-right">-{formatRupiah(downPayment)}</td></tr>
                  <tr className="font-bold"><td>Sisa</td><td className="text-right">{formatRupiah(remaining)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <SignatureBox
              title="Customer"
              sig={invoice.signatures.customerSignature}
              inDate={invoice.signatures.customerInDate}
              outDate={invoice.signatures.customerOutDate}
            />
            <SignatureBox
              title={c.name}
              sig={invoice.signatures.companySignature}
              inDate={invoice.signatures.companyInDate}
              outDate={invoice.signatures.companyOutDate}
            />
          </div>

          {/* Terms */}
          <div className="grid grid-cols-2 gap-3 text-[9px] leading-relaxed">
            <div>
              <div className="font-semibold mb-0.5" style={{ color: brand }}>Under Warranty</div>
              <div className="doc-muted whitespace-pre-wrap">{invoice.terms.warranty}</div>
            </div>
            <div>
              <div className="font-semibold mb-0.5" style={{ color: brand }}>General</div>
              <div className="doc-muted whitespace-pre-wrap">{invoice.terms.general}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  return { draft: "Draft", paid: "Lunas", unpaid: "Belum Bayar", partial: "DP" }[s] || s;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-[0.2em] doc-muted">{children}</div>;
}
function Section({ title, brand, children }: any) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: brand }}>{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-start gap-1.5 text-[10px] doc-muted"><span className="mt-0.5">{icon}</span><span className="break-words">{text}</span></div>;
}
function Th({ children, className = "" }: any) {
  return <th className={`px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider doc-muted ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: any) {
  return <td className={`px-2 py-1.5 ${className}`}>{children}</td>;
}
function SignatureBox({ title, sig, inDate, outDate }: { title: string; sig?: string; inDate?: string; outDate?: string }) {
  return (
    <div className="doc-card-2 rounded p-2">
      <div className="doc-muted uppercase text-[9px] tracking-wider">{title}</div>
      <div className="my-1 h-14 rounded bg-white/95 flex items-center justify-center overflow-hidden">
        {sig ? <img src={sig} alt="sig" className="h-full object-contain" /> : <span className="text-[9px] text-slate-400">— Tanda tangan —</span>}
      </div>
      <div className="flex justify-between text-[9px] doc-muted">
        <span>In: {formatDateID(inDate)}</span>
        <span>Out: {formatDateID(outDate)}</span>
      </div>
    </div>
  );
}
