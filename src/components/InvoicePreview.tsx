import type { Invoice } from '@/types/invoice';
import { calcTotals } from '@/lib/calc';
import { formatDateID, formatRupiah } from '@/lib/format';
import { Mail, Phone, MapPin, StickyNote, Wallet, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { TradeInDevice } from '@/types/circle-phone';

interface Props {
  invoice: Invoice & { tradeIn?: TradeInDevice };
}

export default function InvoicePreview({ invoice }: Props) {
  const { grandTotal, downPayment, remaining, subtotal, discountTotal, taxTotal } = calcTotals(invoice);
  const brand = invoice.templateSettings.brandColor || invoice.company.brandColor;
  const headerColor = '#2A313B';
  const ts = invoice.templateSettings;
  const c = invoice.company;
  const logoSrc = c.logo || '/logocircle.png';
  const invoiceQrUrl = (invoice.companyType === 'circle-phone' || invoice.status === 'paid')
    ? 'https://circlephones.id'
    : `https://circlephones.id/rincian-invoice/?invoice=${encodeURIComponent(invoice.id)}`;
  const showQr = ts.showQr && c.qrImage;
  const docTheme = {
    '--doc-bg': '0 0% 100%',
    '--doc-surface': '0 0% 100%',
    '--doc-surface-2': '0 0% 96%',
    '--doc-border': '0 0% 82%',
    '--doc-foreground': '0 0% 0%',
    '--doc-muted': '0 0% 0%',
  } as React.CSSProperties;

  return (
    <div
      className="invoice-print-root mx-auto w-full max-w-[210mm] overflow-hidden rounded-xl shadow-2xl"
      style={{ ...docTheme, background: 'hsl(var(--doc-bg))', color: 'hsl(var(--doc-foreground))', aspectRatio: '210 / 297', minHeight: '297mm' }}
    >
      <div className="p-5">
        {/* TOP NAVBAR */}
        <div className="grid rounded-2xl overflow-hidden" style={{ gridTemplateColumns: '30% 70%' }}>
          <div className="flex w-full min-h-[140px] flex-col items-start justify-center gap-2 bg-[#2A313B] p-4 md:p-5">
            <img src={logoSrc} alt="Circle Pair" className="h-16 w-auto max-w-[150px] object-contain" />
            <div>
              <div className="text-lg font-bold leading-tight text-white">{c.name}</div>
              {c.tagline && <div className="text-[10px] uppercase tracking-wider text-white/85">{c.tagline}</div>}
            </div>
          </div>

          <div className="flex min-h-[140px] items-start justify-between gap-3 bg-[#2A313B] px-4 py-4 md:px-6 md:py-5 text-white">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/90">{invoice.documentType === 'invoice' ? 'Invoice' : 'Service Order'}</div>
              <h1 className="text-2xl font-bold mt-0.5 text-white">{invoice.number}</h1>
            </div>
            <div className="text-right text-[10px]">
              <div className="uppercase tracking-wider text-white/90">Tanggal</div>
              <div className="font-medium text-white">{formatDateID(invoice.date)}</div>
              <div className="uppercase tracking-wider mt-1 text-white/90">Jatuh Tempo</div>
              <div className="font-medium text-white">{formatDateID(invoice.dueDate)}</div>
              <div className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase" style={{ background: '#111827', color: '#fff' }}>
                {statusLabel(invoice.status)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid" style={{ gridTemplateColumns: '30% 70%' }}>
          {/* SIDEBAR */}
          <aside className="flex h-full flex-col gap-4 px-0 pb-0 pt-0" style={{ background: 'hsl(var(--doc-surface))' }}>
            <Section title="Contact" brand={headerColor}>
              <Row icon={<Phone className="h-3 w-3" />} text={c.phone} />
              <Row icon={<MapPin className="h-3 w-3" />} text={c.address} />
            </Section>

            <Section title="Mail" brand={headerColor}>
              <Row icon={<Mail className="h-3 w-3" />} text={c.email} />
            </Section>

            {invoice.notes && (
              <Section title="Notes" brand={headerColor}>
                <div className="text-[10px] leading-relaxed doc-muted whitespace-pre-wrap">{invoice.notes}</div>
              </Section>
            )}

            <Section title="Payment Methods" brand={headerColor}>
              <div className="text-[10px] leading-relaxed doc-muted whitespace-pre-wrap">{c.paymentMethods}</div>
            </Section>

            <div className="mt-auto space-y-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-black">Scan Invoice</div>
                <div className="rounded-md bg-white p-2 inline-block">
                  <QRCodeSVG value={invoiceQrUrl} size={112} level="M" includeMargin />
                </div>
                <div className="mt-1 max-w-[170px] text-[9px] doc-muted break-all text-center">{invoiceQrUrl}</div>
              </div>

              {showQr && (
                <div>
                  <div className="text-[10px] doc-muted mb-1 uppercase tracking-wider">Scan to Pay</div>
                  <div className="rounded-md bg-white p-2 inline-block">
                    <img src={c.qrImage} alt="QR" className="h-24 w-24 object-contain" />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex h-full flex-col gap-3 p-0 pl-5">
            {/* Device Table */}
            {ts.showDeviceTable && (
              <div>
                <SectionTitle>Device</SectionTitle>
                <table className="mt-1 w-full border-collapse text-[10px]">
                  <thead>
                    <tr style={{ background: 'hsl(var(--doc-surface-2))' }}>
                      <Th>Type</Th>
                      <Th>Storage</Th>
                      <Th>Color</Th>
                      <Th>IMEI / SN</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t doc-divider">
                      <Td>{invoice.device.type || '-'}</Td>
                      <Td>{invoice.device.storage || '-'}</Td>
                      <Td>{invoice.device.color || '-'}</Td>
                      <Td className="font-mono">{invoice.device.imei || '-'}</Td>
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
                <div className="font-semibold text-sm">{invoice.customer.name || '-'}</div>
                <div className="doc-muted">{invoice.customer.phone}</div>
                <div className="doc-muted">{invoice.customer.address}</div>
              </div>
              <div className="grid grid-rows-2 gap-2">
                <div className="doc-card-2 rounded p-2">
                  <div className="doc-muted uppercase text-[9px] tracking-wider">Email</div>
                  <div className="truncate">{invoice.customer.email || '-'}</div>
                </div>
                {ts.showPin && (
                  <div className="doc-card-2 rounded p-2">
                    <div className="doc-muted uppercase text-[9px] tracking-wider">PIN / Lock</div>
                    <div className="font-mono tracking-widest">{invoice.customer.pin || '—'}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Trade-In */}
            {invoice.tradeIn && (invoice.tradeIn.model || invoice.tradeIn.storage || invoice.tradeIn.color || invoice.tradeIn.imei || invoice.tradeIn.notes) && (
              <div>
                <SectionTitle>Trade-In</SectionTitle>
                <table className="mt-1 w-full border-collapse text-[10px]">
                  <thead>
                    <tr style={{ background: 'hsl(var(--doc-surface-2))' }}>
                      <Th>Model</Th>
                      <Th>Storage</Th>
                      <Th>Color</Th>
                      <Th>IMEI / SN</Th>
                      <Th>Condition</Th>
                      <Th className="text-right w-24">Estimasi</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t doc-divider align-top">
                      <Td>
                        <div className="font-medium">{invoice.tradeIn.model || '-'}</div>
                      </Td>
                      <Td>{invoice.tradeIn.storage || '-'}</Td>
                      <Td>{invoice.tradeIn.color || '-'}</Td>
                      <Td className="font-mono">{invoice.tradeIn.imei || '-'}</Td>
                      <Td>{invoice.tradeIn.condition || '-'}</Td>
                      <Td className="text-right">{formatRupiah(invoice.tradeIn.estimatedPrice || 0)}</Td>
                    </tr>
                  </tbody>
                </table>
                {invoice.tradeIn.notes && (
                  <div className="mt-1 doc-card-2 rounded p-2 text-[10px]">
                    <div className="doc-muted uppercase text-[9px] tracking-wider mb-0.5">Keterangan Trade-In</div>
                    <div className="whitespace-pre-wrap">{invoice.tradeIn.notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div>
              <SectionTitle>Items</SectionTitle>
              <table className="mt-1 w-full border-collapse text-[10px]">
                <thead>
                  <tr style={{ background: 'hsl(var(--doc-surface-2))' }}>
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
                          <div className="font-medium">{it.name || '-'}</div>
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
                <div className="doc-muted uppercase text-[9px] tracking-wider mb-1 flex items-center gap-1">
                  <Wallet className="h-3 w-3" /> Payment
                </div>
                <div className="flex justify-between">
                  <span className="doc-muted">Metode</span>
                  <span>{invoice.payment.method}</span>
                </div>
                {invoice.payment.notes && <div className="doc-muted mt-1 text-[9px]">{invoice.payment.notes}</div>}
              </div>
              <div className="rounded p-2" style={{ background: brand, color: '#111' }}>
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr>
                      <td>Subtotal</td>
                      <td className="text-right">{formatRupiah(subtotal)}</td>
                    </tr>
                    {discountTotal > 0 && (
                      <tr>
                        <td>Diskon</td>
                        <td className="text-right">-{formatRupiah(discountTotal)}</td>
                      </tr>
                    )}
                    {taxTotal > 0 && (
                      <tr>
                        <td>Pajak</td>
                        <td className="text-right">{formatRupiah(taxTotal)}</td>
                      </tr>
                    )}
                    <tr className="font-bold border-t border-black/30">
                      <td className="pt-1">Grand Total</td>
                      <td className="text-right pt-1">{formatRupiah(grandTotal)}</td>
                    </tr>
                    <tr>
                      <td>Down Payment</td>
                      <td className="text-right">-{formatRupiah(downPayment)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td>Belum bayar</td>
                      <td className="text-right">{formatRupiah(remaining)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <SignatureBox title="Customer" sig={invoice.signatures.customerSignature} inDate={invoice.signatures.customerInDate} outDate={invoice.signatures.customerOutDate} />
              <SignatureBox title={c.name} sig={invoice.signatures.companySignature} inDate={invoice.signatures.companyInDate} outDate={invoice.signatures.companyOutDate} />
            </div>

            {/* Terms */}
            <div className="grid grid-cols-2 gap-3 text-[9px] leading-relaxed">
              <div>
                <div className="font-semibold mb-0.5" style={{ color: brand }}>
                  Under Warranty
                </div>
                <div className="doc-muted whitespace-pre-wrap">{invoice.terms.warranty}</div>
              </div>
              <div>
                <div className="font-semibold mb-0.5" style={{ color: brand }}>
                  General
                </div>
                <div className="doc-muted whitespace-pre-wrap">{invoice.terms.general}</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  return { draft: 'Draft', paid: 'Lunas', unpaid: 'Belum Bayar', partial: 'DP' }[s] || s;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-[0.2em] doc-muted">{children}</div>;
}
function Section({ title, brand, children }: any) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: brand }}>
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-1.5 text-[10px] doc-muted">
      <span className="mt-0.5">{icon}</span>
      <span className="break-words">{text}</span>
    </div>
  );
}
function Th({ children, className = '' }: any) {
  return <th className={`px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider doc-muted ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: any) {
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
