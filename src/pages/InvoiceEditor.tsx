import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, Printer, Download, Share2, ArrowLeft, FileText, Eye } from 'lucide-react';
import InvoicePreview from '@/components/InvoicePreview';
import SignaturePad from '@/components/SignaturePad';
import ImageUpload from '@/components/ImageUpload';
import { blankInvoice } from '@/lib/seed';
import { getInvoice, saveCompany, upsertInvoice } from '@/lib/storage';
import { getCompanyByType, type Invoice, type InvoiceItem } from '@/types/invoice';
import { newId, formatRupiah } from '@/lib/format';
import { calcTotals } from '@/lib/calc';
import { toast } from 'sonner';

export default function InvoiceEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [inv, setInv] = useState<Invoice>(() => {
    if (id && id !== 'new') {
      const existing = getInvoice(id);
      if (existing) return existing;
    }
    // Get companyType from navigation state
    const companyType = (location.state as { companyType?: 'circle-pair' | 'circle-phone' })?.companyType || 'circle-pair';
    return blankInvoice(getCompanyByType(companyType), companyType);
  });

  // Re-load on id change
  useEffect(() => {
    if (id && id !== 'new') {
      const e = getInvoice(id);
      if (e) setInv(e);
    }
  }, [id]);

  const totals = useMemo(() => calcTotals(inv), [inv]);

  const update = (patch: Partial<Invoice>) => setInv((p) => ({ ...p, ...patch, updatedAt: new Date().toISOString() }));
  const updCustomer = (k: keyof Invoice['customer'], v: string) => setInv((p) => ({ ...p, customer: { ...p.customer, [k]: v } }));
  const updDevice = (k: keyof Invoice['device'], v: string) => setInv((p) => ({ ...p, device: { ...p.device, [k]: v } }));
  const updPayment = (k: keyof Invoice['payment'], v: any) => setInv((p) => ({ ...p, payment: { ...p.payment, [k]: v } }));
  const updCompany = (k: keyof Invoice['company'], v: any) => setInv((p) => ({ ...p, company: { ...p.company, [k]: v } }));
  const updTpl = (k: keyof Invoice['templateSettings'], v: any) => setInv((p) => ({ ...p, templateSettings: { ...p.templateSettings, [k]: v } }));
  const updSig = (k: keyof Invoice['signatures'], v: any) => setInv((p) => ({ ...p, signatures: { ...p.signatures, [k]: v } }));

  const addItem = () => setInv((p) => ({ ...p, items: [...p.items, { id: newId(), name: '', description: '', qty: 1, unitPrice: 0, discount: 0, tax: 0 }] }));
  const updItem = (idx: number, patch: Partial<InvoiceItem>) => setInv((p) => ({ ...p, items: p.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const delItem = (idx: number) => setInv((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const validate = () => {
    const errs: string[] = [];
    if (!inv.customer.name.trim()) errs.push('Nama customer wajib diisi');
    if (!inv.number.trim()) errs.push('Nomor invoice wajib diisi');
    if (inv.items.length === 0 || inv.items.every((i) => !i.name.trim())) errs.push('Minimal satu item biaya');
    if (!inv.device.type.trim() && !inv.device.imei.trim()) errs.push('Data device (Type/IMEI) wajib diisi');
    return errs;
  };

  const save = (silent = false) => {
    const errs = validate();
    if (errs.length) {
      errs.forEach((e) => toast.error(e));
      return false;
    }
    try {
      upsertInvoice(inv);
      saveCompany(inv.company);
      if (!silent) toast.success('Invoice disimpan');
      if (id === 'new') nav(`/invoice/${inv.id}`, { replace: true });

      // Fire-and-forget: try to sync to serverless API (Neon). Don't block UI or printing.
      try {
        // Only attempt remote sync in production (deployed) to avoid errors during local dev
        if (typeof fetch === 'function' && import.meta.env.PROD) {
          fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inv),
          })
            .then((r) => {
              if (!r.ok) throw new Error('remote save failed');
              if (!silent) toast.success('Sinkron ke server berhasil');
            })
            .catch((err) => {
              console.warn('Remote save failed', err);
              if (!silent) toast.error('Gagal menyimpan ke server');
            });
        }
      } catch (e) {
        console.warn('Failed to start remote sync', e);
      }

      return true;
    } catch (err: any) {
      console.error('Failed to save to localStorage:', err);
      if (!silent) {
        toast.error('Gagal menyimpan: penyimpanan browser penuh atau terjadi error');
        return false;
      }
      // When called silently (eg. before printing), allow the action to continue
      // even if saving failed (so users can still print/download PDF).
      toast.error('Gagal menyimpan ke storage; melanjutkan proses cetak/unduh');
      if (id === 'new') nav(`/invoice/${inv.id}`, { replace: true });
      return true;
    }
  };

  const print = () => {
    if (save(true)) setTimeout(() => window.print(), 100);
  };
  const share = async () => {
    const t = calcTotals(inv);
    const text =
      `*${inv.company.name}* — ${inv.documentType === 'invoice' ? 'Invoice' : 'Service Order'} ${inv.number}\n` +
      `Customer: ${inv.customer.name}\nDevice: ${inv.device.type} ${inv.device.storage} ${inv.device.color}\nIMEI: ${inv.device.imei}\n` +
      `Total: ${formatRupiah(t.grandTotal)}\nDP: ${formatRupiah(t.downPayment)}\nSisa: ${formatRupiah(t.remaining)}\nStatus: ${inv.status}`;
    try {
      if (navigator.share) await navigator.share({ title: inv.number, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Ringkasan disalin');
      }
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-4 p-4 lg:p-6">
      {/* Toolbar */}
      <div className="no-print lg:col-span-2 flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <div className="hidden md:block text-sm text-muted-foreground">·</div>
          <div className="font-semibold truncate max-w-[200px] md:max-w-none">{inv.number || 'Invoice Baru'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={share}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={print}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={print}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button size="sm" onClick={() => save()}>
            <Save className="h-4 w-4 mr-1" />
            Simpan
          </Button>
        </div>
      </div>

      {/* Form / Preview tabs on mobile */}
      <div className="lg:hidden no-print">
        <Tabs defaultValue="form">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="form">
              <FileText className="h-4 w-4 mr-1" />
              Form
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="mt-3">
            <EditorForm
              inv={inv}
              totals={totals}
              update={update}
              updCustomer={updCustomer}
              updDevice={updDevice}
              updPayment={updPayment}
              updCompany={updCompany}
              updTpl={updTpl}
              updSig={updSig}
              addItem={addItem}
              updItem={updItem}
              delItem={delItem}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-3">
            <InvoicePreview invoice={inv} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: form left, preview right */}
      <div className="hidden lg:block no-print">
        <EditorForm
          inv={inv}
          totals={totals}
          update={update}
          updCustomer={updCustomer}
          updDevice={updDevice}
          updPayment={updPayment}
          updCompany={updCompany}
          updTpl={updTpl}
          updSig={updSig}
          addItem={addItem}
          updItem={updItem}
          delItem={delItem}
        />
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-20">
          <InvoicePreview invoice={inv} />
        </div>
      </div>

      {/* Print-only: show preview full */}
      <div className="print-only">
        <InvoicePreview invoice={inv} />
      </div>
    </div>
  );
}

function EditorForm(props: any) {
  const { inv, totals, update, updCustomer, updDevice, updPayment, updCompany, updTpl, updSig, addItem, updItem, delItem } = props;
  return (
    <Tabs defaultValue="doc" className="space-y-4">
      <TabsList className="flex w-full overflow-x-auto">
        <TabsTrigger value="doc">Dokumen</TabsTrigger>
        <TabsTrigger value="customer">Customer</TabsTrigger>
        <TabsTrigger value="device">Device</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="payment">Pembayaran</TabsTrigger>
        <TabsTrigger value="sign">Tanda Tangan</TabsTrigger>
        <TabsTrigger value="terms">Syarat</TabsTrigger>
        <TabsTrigger value="company">Perusahaan</TabsTrigger>
        <TabsTrigger value="template">Template</TabsTrigger>
      </TabsList>

      <TabsContent value="doc">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <Field label="Nomor">
              <Input value={inv.number} onChange={(e) => update({ number: e.target.value })} />
            </Field>
            <Field label="Tipe Dokumen">
              <Select value={inv.documentType} onValueChange={(v) => update({ documentType: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_order">Service Order</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tanggal">
              <Input type="date" value={inv.date} onChange={(e) => update({ date: e.target.value })} />
            </Field>
            <Field label="Jatuh Tempo">
              <Input type="date" value={inv.dueDate} onChange={(e) => update({ dueDate: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={inv.status} onValueChange={(v) => update({ status: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unpaid">Belum Bayar</SelectItem>
                  <SelectItem value="partial">DP</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Catatan Sidebar" className="md:col-span-2">
              <Textarea rows={2} value={inv.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Catatan singkat untuk customer (tampil di sidebar)" />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="customer">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <Field label="Nama *">
              <Input value={inv.customer.name} onChange={(e) => updCustomer('name', e.target.value)} />
            </Field>
            <Field label="Telepon">
              <Input value={inv.customer.phone} onChange={(e) => updCustomer('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={inv.customer.email} onChange={(e) => updCustomer('email', e.target.value)} />
            </Field>
            <Field label="PIN / Lock">
              <Input value={inv.customer.pin} onChange={(e) => updCustomer('pin', e.target.value)} />
            </Field>
            <Field label="Alamat" className="md:col-span-2">
              <Textarea rows={2} value={inv.customer.address} onChange={(e) => updCustomer('address', e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="device">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <Field label="Type / Model *">
              <Input value={inv.device.type} onChange={(e) => updDevice('type', e.target.value)} placeholder="iPhone 13 Pro" />
            </Field>
            <Field label="Storage">
              <Input value={inv.device.storage} onChange={(e) => updDevice('storage', e.target.value)} placeholder="256 GB" />
            </Field>
            <Field label="Color">
              <Input value={inv.device.color} onChange={(e) => updDevice('color', e.target.value)} />
            </Field>
            <Field label="IMEI / Serial *">
              <Input value={inv.device.imei} onChange={(e) => updDevice('imei', e.target.value)} />
            </Field>
            <Field label="Status Garansi">
              <Input value={inv.device.warrantyStatus} onChange={(e) => updDevice('warrantyStatus', e.target.value)} placeholder="Garansi 30 Hari" />
            </Field>
            <Field label="Keluhan" className="md:col-span-2">
              <Textarea rows={2} value={inv.device.complaint} onChange={(e) => updDevice('complaint', e.target.value)} />
            </Field>
            <Field label="Diagnosa / Tindakan" className="md:col-span-2">
              <Textarea rows={2} value={inv.device.diagnosis} onChange={(e) => updDevice('diagnosis', e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="items">
        <Card>
          <CardContent className="p-4 space-y-3">
            {inv.items.map((it: InvoiceItem, idx: number) => (
              <div key={it.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-muted-foreground">Item #{idx + 1}</div>
                  <Button variant="ghost" size="sm" onClick={() => delItem(idx)} className="h-7 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <Field label="Nama / Layanan">
                    <Input value={it.name} onChange={(e) => updItem(idx, { name: e.target.value })} />
                  </Field>
                  <Field label="Deskripsi">
                    <Input value={it.description} onChange={(e) => updItem(idx, { description: e.target.value })} />
                  </Field>
                  <Field label="Qty">
                    <Input type="number" min={0} value={it.qty} onChange={(e) => updItem(idx, { qty: +e.target.value })} />
                  </Field>
                  <Field label="Harga Satuan">
                    <Input type="number" min={0} value={it.unitPrice} onChange={(e) => updItem(idx, { unitPrice: +e.target.value })} />
                  </Field>
                  <Field label="Diskon (Rp)">
                    <Input type="number" min={0} value={it.discount} onChange={(e) => updItem(idx, { discount: +e.target.value })} />
                  </Field>
                  <Field label="Pajak (%)">
                    <Input type="number" min={0} value={it.tax} onChange={(e) => updItem(idx, { tax: +e.target.value })} />
                  </Field>
                </div>
                <div className="text-right text-sm">
                  Subtotal: <span className="font-semibold">{formatRupiah((it.qty || 0) * (it.unitPrice || 0))}</span>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Tambah Item
            </Button>
            <Separator />
            <div className="space-y-1 text-sm">
              <Row label="Subtotal">{formatRupiah(totals.subtotal)}</Row>
              <Row label="Diskon">- {formatRupiah(totals.discountTotal)}</Row>
              <Row label="Pajak">{formatRupiah(totals.taxTotal)}</Row>
              <Row label="Grand Total" bold>
                {formatRupiah(totals.grandTotal)}
              </Row>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payment">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <Field label="Grand Total">
              <Input readOnly value={formatRupiah(totals.grandTotal)} />
            </Field>
            <Field label="Down Payment">
              <Input type="number" min={0} value={inv.payment.downPayment} onChange={(e) => updPayment('downPayment', +e.target.value)} />
            </Field>
            <Field label="Sisa Pembayaran">
              <Input readOnly value={formatRupiah(totals.remaining)} />
            </Field>
            <Field label="Metode Pembayaran">
              <Input value={inv.payment.method} onChange={(e) => updPayment('method', e.target.value)} />
            </Field>
            <Field label="Catatan Pembayaran" className="md:col-span-2">
              <Textarea rows={2} value={inv.payment.notes} onChange={(e) => updPayment('notes', e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sign">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-semibold text-sm">Customer</div>
              <SignaturePad value={inv.signatures.customerSignature} onChange={(v) => updSig('customerSignature', v)} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="In Date">
                  <Input type="date" value={inv.signatures.customerInDate || ''} onChange={(e) => updSig('customerInDate', e.target.value)} />
                </Field>
                <Field label="Out Date">
                  <Input type="date" value={inv.signatures.customerOutDate || ''} onChange={(e) => updSig('customerOutDate', e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-sm">Perusahaan</div>
              <SignaturePad value={inv.signatures.companySignature} onChange={(v) => updSig('companySignature', v)} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="In Date">
                  <Input type="date" value={inv.signatures.companyInDate || ''} onChange={(e) => updSig('companyInDate', e.target.value)} />
                </Field>
                <Field label="Out Date">
                  <Input type="date" value={inv.signatures.companyOutDate || ''} onChange={(e) => updSig('companyOutDate', e.target.value)} />
                </Field>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="terms">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <Field label="Under Warranty">
              <Textarea rows={8} value={inv.terms.warranty} onChange={(e) => update({ terms: { ...inv.terms, warranty: e.target.value } })} />
            </Field>
            <Field label="General">
              <Textarea rows={8} value={inv.terms.general} onChange={(e) => update({ terms: { ...inv.terms, general: e.target.value } })} />
            </Field>
            <div className="md:col-span-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const c = { ...inv.company, defaultTermsWarranty: inv.terms.warranty, defaultTermsGeneral: inv.terms.general };
                  updCompany('defaultTermsWarranty', inv.terms.warranty);
                  updCompany('defaultTermsGeneral', inv.terms.general);
                  saveCompany(c);
                  toast.success('Syarat disimpan sebagai preset');
                }}
              >
                Simpan sebagai preset perusahaan
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="company">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <Field label="Nama Perusahaan">
              <Input value={inv.company.name} onChange={(e) => updCompany('name', e.target.value)} />
            </Field>
            <Field label="Tagline">
              <Input value={inv.company.tagline || ''} onChange={(e) => updCompany('tagline', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={inv.company.email} onChange={(e) => updCompany('email', e.target.value)} />
            </Field>
            <Field label="Telepon">
              <Input value={inv.company.phone} onChange={(e) => updCompany('phone', e.target.value)} />
            </Field>
            <Field label="Alamat" className="md:col-span-2">
              <Textarea rows={2} value={inv.company.address} onChange={(e) => updCompany('address', e.target.value)} />
            </Field>
            <Field label="Metode Pembayaran" className="md:col-span-2">
              <Textarea rows={3} value={inv.company.paymentMethods} onChange={(e) => updCompany('paymentMethods', e.target.value)} />
            </Field>
            <ImageUpload label="Logo" value={inv.company.logo} onChange={(v) => updCompany('logo', v)} />
            <ImageUpload label="QR Pembayaran" value={inv.company.qrImage} onChange={(v) => updCompany('qrImage', v)} />
            <Field label="Warna Brand">
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={inv.company.brandColor}
                  onChange={(e) => {
                    updCompany('brandColor', e.target.value);
                    updTpl('brandColor', e.target.value);
                  }}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={inv.company.brandColor}
                  onChange={(e) => {
                    updCompany('brandColor', e.target.value);
                    updTpl('brandColor', e.target.value);
                  }}
                />
              </div>
            </Field>
            <div className="md:col-span-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  saveCompany(inv.company);
                  toast.success('Profil perusahaan tersimpan');
                }}
              >
                Simpan sebagai profil default
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="template">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Toggle label="Tampilkan QR Code" checked={inv.templateSettings.showQr} onChange={(v) => updTpl('showQr', v)} />
            <Toggle label="Tampilkan PIN / Lock" checked={inv.templateSettings.showPin} onChange={(v) => updTpl('showPin', v)} />
            <Toggle label="Tampilkan Tabel Device" checked={inv.templateSettings.showDeviceTable} onChange={(v) => updTpl('showDeviceTable', v)} />
            <Field label="Warna Brand Template">
              <div className="flex gap-2">
                <Input type="color" value={inv.templateSettings.brandColor} onChange={(e) => updTpl('brandColor', e.target.value)} className="w-16 h-10 p-1" />
                <Input value={inv.templateSettings.brandColor} onChange={(e) => updTpl('brandColor', e.target.value)} />
              </div>
            </Field>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function Row({ label, children, bold }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-base border-t pt-1' : 'text-muted-foreground'}`}>
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
