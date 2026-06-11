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
import { saveCompany, loadCompany } from '@/lib/storage';
import { getInvoice, upsertInvoice, findOrCreateUser, loadUsers } from '@/lib/storage-api';
import type { UserProfile } from '@/types/user';
import { getCompanyByType, type Invoice, type InvoiceItem } from '@/types/invoice';
import { newId, formatRupiah } from '@/lib/format';
import { calcTotals } from '@/lib/calc';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

export default function InvoiceEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [inv, setInv] = useState<Invoice>(() => {
    const companyType = (location.state as { companyType?: 'circle-pair' | 'circle-phone' })?.companyType || 'circle-pair';
    return blankInvoice(getCompanyByType(companyType), companyType);
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('new');

  useEffect(() => {
    loadUsers()
      .then((list) => {
        setUsers(list);
        if (inv.customer.phone) {
          const found = list.find((u) => u.phone === inv.customer.phone);
          if (found) setSelectedUserId(found.id);
        }
      })
      .catch((err) => console.warn('Failed to load users', err));
  }, []);

  const handleCustomerChange = (userId: string) => {
    setSelectedUserId(userId);
    if (userId === 'new') {
      update({
        customer: {
          name: '',
          phone: '',
          email: '',
          address: '',
          pin: '',
          notes: '',
        },
      });
    } else {
      const selectedUser = users.find((u) => u.id === userId);
      if (selectedUser) {
        update({
          customer: {
            name: selectedUser.name,
            phone: selectedUser.phone,
            email: selectedUser.email || '',
            address: selectedUser.address || '',
            pin: selectedUser.pin || '',
            notes: selectedUser.notes || '',
          },
        });
      }
    }
  };

  // Re-load on id change
  useEffect(() => {
    let mounted = true;
    if (id && id !== 'new') {
      getInvoice(id)
        .then((e) => {
          if (mounted && e) {
            setInv(e);
            if (e.customer.phone) {
              const found = users.find((u) => u.phone === e.customer.phone);
              if (found) setSelectedUserId(found.id);
            }
          }
        })
        .catch((err) => console.error('Failed to load invoice:', err));
    }
    return () => {
      mounted = false;
    };
  }, [id, users]);

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

  const save = async (silent = false) => {
    const errs = validate();
    if (errs.length) {
      errs.forEach((e) => toast.error(e));
      return false;
    }
    try {
      let nextInv = { ...inv };
      if (inv.customer.phone) {
        const userProfile = await findOrCreateUser(inv.customer.name, inv.customer.phone, {
          email: inv.customer.email,
          address: inv.customer.address,
          notes: inv.customer.notes,
        });
        nextInv = {
          ...inv,
          customerId: userProfile.id,
        };
      }

      const savedList = await upsertInvoice(nextInv);
      const saved = savedList.find((row) => row.id === nextInv.id) || savedList[0] || nextInv;
      setInv(saved);

      if (!silent) toast.success('Invoice disimpan');
      if (id === 'new') nav(`/invoice/${saved.id}`, { replace: true });

      return true;
    } catch (err: any) {
      console.error('Failed to save invoice:', err);
      if (!silent) {
        toast.error('Gagal menyimpan: ' + (err.message || 'terjadi error'));
        return false;
      }
      toast.error('Gagal menyimpan ke storage; melanjutkan');
      if (id === 'new') nav(`/invoice/${inv.id}`, { replace: true });
      return true;
    }
  };

  const print = async () => {
    if (await save(true)) setTimeout(() => window.print(), 100);
  };
  const share = async () => {
    toast.loading('Menyiapkan PDF...', { id: 'share-pdf' });
    const element = document.querySelector('.print-only') as HTMLElement;
    if (!element) {
      toast.dismiss('share-pdf');
      return;
    }
    
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    const originalLeft = element.style.left;
    const originalTop = element.style.top;
    
    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';

    const opt = {
      margin:       0,
      filename:     `Invoice-${inv.number}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(element.firstElementChild || element).outputPdf('blob');
      
      element.style.display = originalDisplay;
      element.style.position = originalPosition;
      element.style.left = originalLeft;
      element.style.top = originalTop;

      toast.dismiss('share-pdf');
      const file = new File([pdfBlob], `Invoice-${inv.number}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${inv.number}`,
          files: [file]
        });
      } else {
        const t = calcTotals(inv);
        const text =
          `*${inv.company.name}* — ${inv.documentType === 'invoice' ? 'Invoice' : 'Service Order'} ${inv.number}\n` +
          `Customer: ${inv.customer.name}\nDevice: ${inv.device.type} ${inv.device.storage} ${inv.device.color}\nIMEI: ${inv.device.imei}\n` +
          `Total: ${formatRupiah(t.grandTotal)}\nDP: ${formatRupiah(t.downPayment)}\nSisa: ${formatRupiah(t.remaining)}\nStatus: ${inv.status}`;
        if (navigator.share) {
          await navigator.share({ title: inv.number, text });
        } else {
          await navigator.clipboard.writeText(text);
          toast.success('Ringkasan disalin (Share tidak didukung)');
        }
      }
    } catch (err) {
      console.error(err);
      element.style.display = originalDisplay;
      element.style.position = originalPosition;
      element.style.left = originalLeft;
      element.style.top = originalTop;

      toast.dismiss('share-pdf');
      toast.error('Gagal membuat PDF');
    }
  };

  return (
    <div className="print-page grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-4 p-4 lg:p-6 w-full">
      {/* Toolbar */}
      <div className="no-print lg:col-span-2 flex flex-wrap items-center justify-between gap-2 mb-2 w-full border-b pb-3">
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
            Print / Preview
          </Button>
          <Button size="sm" onClick={() => save()}>
            <Save className="h-4 w-4 mr-1" />
            Simpan
          </Button>
        </div>
      </div>

      {/* Form / Preview tabs on mobile */}
      <div className="lg:hidden no-print w-full col-span-1">
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
          <TabsContent value="form" className="mt-3 w-full">
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
              users={users}
              selectedUserId={selectedUserId}
              handleCustomerChange={handleCustomerChange}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-3 w-full animate-in fade-in duration-300">
            <InvoicePreview invoice={inv} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: form left, preview right */}
      <div className="hidden lg:block no-print w-full col-span-1">
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
          users={users}
          selectedUserId={selectedUserId}
          handleCustomerChange={handleCustomerChange}
        />
      </div>
      <div className="hidden lg:block w-full col-span-1">
        <div className="sticky top-20">
          <InvoicePreview invoice={inv} />
        </div>
      </div>

      {/* Print-only layout */}
      <div className="print-only w-full lg:col-span-2">
        <InvoicePreview invoice={inv} />
      </div>
    </div>
  );
}

function EditorForm({ inv, totals, update, updCustomer, updDevice, updPayment, updCompany, updTpl, updSig, addItem, updItem, delItem, users, selectedUserId, handleCustomerChange }: any) {
  return (
    <Tabs defaultValue="details" className="space-y-4">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="details">Pelanggan</TabsTrigger>
        <TabsTrigger value="device">Device</TabsTrigger>
        <TabsTrigger value="items">Biaya</TabsTrigger>
        <TabsTrigger value="signatures">Signature</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Nomor Dokumen">
                <Input value={inv.number} onChange={(e) => update({ number: e.target.value })} />
              </Field>
              <Field label="Tipe Dokumen">
                <Select value={inv.documentType} onValueChange={(v: any) => update({ documentType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="service_order">Service Order</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tanggal Masuk">
                <Input type="date" value={inv.date} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="Estimasi Selesai">
                <Input type="date" value={inv.dueDate} onChange={(e) => update({ dueDate: e.target.value })} />
              </Field>
              <Field label="Status Pembayaran">
                <Select value={inv.status} onValueChange={(v: any) => update({ status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="unpaid">Belum Bayar (Unpaid)</SelectItem>
                    <SelectItem value="partial">Bayar Sebagian (DP)</SelectItem>
                    <SelectItem value="paid">Lunas (Paid)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Data Customer</h3>

              <div className="space-y-2">
                <Label className="text-xs">Pilih Customer Terdaftar</Label>
                <Select value={selectedUserId} onValueChange={handleCustomerChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Tambah Customer Baru</SelectItem>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-3 pt-2">
                <Field label="Nama Lengkap *">
                  <Input value={inv.customer.name} onChange={(e) => updCustomer('name', e.target.value)} placeholder="Nama lengkap..." />
                </Field>
                <Field label="No. Handphone / WhatsApp *">
                  <Input value={inv.customer.phone} onChange={(e) => updCustomer('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
                </Field>
                <Field label="Email">
                  <Input value={inv.customer.email || ''} onChange={(e) => updCustomer('email', e.target.value)} placeholder="customer@email.com" />
                </Field>
                <Field label="PIN Lock / Pola">
                  <Input value={inv.customer.pin || ''} onChange={(e) => updCustomer('pin', e.target.value)} placeholder="1234 / Pola L" />
                </Field>
                <Field label="Alamat Customer" className="md:col-span-2">
                  <Textarea rows={2} value={inv.customer.address || ''} onChange={(e) => updCustomer('address', e.target.value)} placeholder="Alamat lengkap..." />
                </Field>
                <Field label="Catatan Tambahan Pelanggan" className="md:col-span-2">
                  <Textarea rows={2} value={inv.customer.notes || ''} onChange={(e) => updCustomer('notes', e.target.value)} placeholder="Catatan opsional..." />
                </Field>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="device">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <Field label="Model / Tipe Device *">
              <Input value={inv.device.type} onChange={(e) => updDevice('type', e.target.value)} placeholder="iPhone 13, Galaxy S22..." />
            </Field>
            <Field label="Kapasitas Storage">
              <Input value={inv.device.storage} onChange={(e) => updDevice('storage', e.target.value)} placeholder="128GB, 256GB..." />
            </Field>
            <Field label="Warna">
              <Input value={inv.device.color} onChange={(e) => updDevice('color', e.target.value)} placeholder="Graphite, Sierra Blue..." />
            </Field>
            <Field label="IMEI / Serial Number *">
              <Input value={inv.device.imei} onChange={(e) => updDevice('imei', e.target.value)} placeholder="35xxxxxxxxxxxxx" />
            </Field>
            <Field label="Keluhan Kerusakan *">
              <Textarea rows={3} value={inv.device.complaint} onChange={(e) => updDevice('complaint', e.target.value)} placeholder="Layar retak, mati total, baterai kembung..." />
            </Field>
            <Field label="Hasil Diagnosa Teknis">
              <Textarea rows={3} value={inv.device.diagnosis} onChange={(e) => updDevice('diagnosis', e.target.value)} placeholder="LCD pecah perlu diganti..." />
            </Field>
            <div className="md:col-span-2">
              <Field label="Status Garansi Service">
                <Select value={inv.device.warrantyStatus} onValueChange={(v: any) => updDevice('warrantyStatus', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-Garansi">Non-Garansi</SelectItem>
                    <SelectItem value="Garansi 7 Hari">Garansi 7 Hari</SelectItem>
                    <SelectItem value="Garansi 30 Hari">Garansi 30 Hari</SelectItem>
                    <SelectItem value="Garansi 90 Hari">Garansi 90 Hari</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="items" className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Daftar Rincian Biaya Service</h3>
              <Button size="sm" variant="outline" onClick={addItem}>
                + Tambah Biaya
              </Button>
            </div>

            <div className="space-y-3">
              {inv.items.map((item, idx) => (
                <Card key={item.id} className="border-border/60 bg-muted/20">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Item Biaya #{idx + 1}</span>
                      {inv.items.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => delItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Field label="Nama Layanan / Part">
                        <Input value={item.name} onChange={(e) => updItem(idx, { name: e.target.value })} placeholder="Ganti LCD, Jasa Service..." />
                      </Field>
                      <Field label="Deskripsi / Keterangan Part">
                        <Input value={item.description} onChange={(e) => updItem(idx, { description: e.target.value })} placeholder="Kualitas Original/OEM..." />
                      </Field>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Field label="Qty">
                        <Input type="number" min={1} value={item.qty} onChange={(e) => updItem(idx, { qty: parseInt(e.target.value) || 1 })} />
                      </Field>
                      <Field label="Harga Satuan (Rp)" className="col-span-2">
                        <Input type="number" min={0} value={item.unitPrice} onChange={(e) => updItem(idx, { unitPrice: parseInt(e.target.value) || 0 })} />
                      </Field>
                      <Field label="Diskon (Rp)">
                        <Input type="number" min={0} value={item.discount} onChange={(e) => updItem(idx, { discount: parseInt(e.target.value) || 0 })} />
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Down Payment (DP / Uang Muka) (Rp)">
                  <Input type="number" min={0} value={inv.payment.downPayment} onChange={(e) => updPayment('downPayment', parseInt(e.target.value) || 0)} />
                </Field>
                <Field label="Catatan Tambahan Transaksi">
                  <Input value={inv.notes || ''} onChange={(e) => update({ notes: e.target.value })} placeholder=" ex: Dibawa dengan charger" />
                </Field>
              </div>

              <div className="border-t pt-3 space-y-2 bg-muted/40 rounded-lg p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal Biaya</span>
                  <span>{formatRupiah(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-500">
                  <span>Diskon Item</span>
                  <span>-{formatRupiah(totals.discountTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-600">
                  <span>Uang Muka (DP)</span>
                  <span>-{formatRupiah(totals.downPayment)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-sm">
                  <span>Sisa Pembayaran</span>
                  <span className={totals.remaining > 0 ? 'text-rose-500' : 'text-emerald-500'}>{formatRupiah(totals.remaining)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signatures">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs">Tanda Tangan Pelanggan</Label>
                <SignaturePad value={inv.signatures.customerSignature} onChange={(v) => updSig('customerSignature', v)} />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Field label="Tanggal Masuk (In)">
                    <Input type="date" value={inv.signatures.customerInDate || ''} onChange={(e) => updSig('customerInDate', e.target.value)} />
                  </Field>
                  <Field label="Tanggal Keluar (Out)">
                    <Input type="date" value={inv.signatures.customerOutDate || ''} onChange={(e) => updSig('customerOutDate', e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tanda Tangan Penerima / Toko</Label>
                <SignaturePad value={inv.signatures.companySignature} onChange={(v) => updSig('companySignature', v)} />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Field label="Tanggal Terima (In)">
                    <Input type="date" value={inv.signatures.companyInDate || ''} onChange={(e) => updSig('companyInDate', e.target.value)} />
                  </Field>
                  <Field label="Tanggal Keluar (Out)">
                    <Input type="date" value={inv.signatures.companyOutDate || ''} onChange={(e) => updSig('companyOutDate', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children, className = '' }: any) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
