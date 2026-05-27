import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Trash2, Save, Printer, ArrowLeft, Smartphone, Cable, FileText, Eye, Share2, Package } from 'lucide-react';
import InvoicePreview from '@/components/InvoicePreview';
import { blankPhoneInvoice } from '@/lib/storage-phone';
import { upsertPhoneInvoice, findOrCreateUser, getPhoneInvoice, getUserByPhone, loadUsers } from '@/lib/storage-api';
import type { UserProfile } from '@/types/user';
import { CONDITION_LABELS, BLANK_SALES_ITEM, BLANK_TRADE_IN, type CirclePhoneInvoice, type SalesItem } from '@/types/circle-phone';
import { newId, formatRupiah } from '@/lib/format';
import { toast } from 'sonner';

export default function PhoneEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState<CirclePhoneInvoice>(() => normalizePhoneInvoice(blankPhoneInvoice()));
  const [showTradeIn, setShowTradeIn] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('new');

  useEffect(() => {
    loadUsers()
      .then((list) => {
        setUsers(list);
        if (inv.customerPhone) {
          const found = list.find((u) => u.phone === inv.customerPhone);
          if (found) setSelectedUserId(found.id);
        }
      })
      .catch((err) => console.warn('Failed to load users', err));
  }, []);

  const handleCustomerChange = (userId: string) => {
    setSelectedUserId(userId);
    if (userId === 'new') {
      update({
        customerId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerInstagram: '',
        customerAddress: '',
      });
    } else {
      const selectedUser = users.find((u) => u.id === userId);
      if (selectedUser) {
        update({
          customerId: selectedUser.id,
          customerName: selectedUser.name,
          customerPhone: selectedUser.phone,
          customerEmail: selectedUser.email || '',
          customerInstagram: selectedUser.instagram || '',
          customerAddress: selectedUser.address || '',
        });
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    if (id && id !== 'new') {
      (async () => {
        try {
          const existing = await getPhoneInvoice(id);
          if (mounted && existing) {
            const normalized = normalizePhoneInvoice(existing);
            setInv(normalized);
            setShowTradeIn(!!normalized.tradeIn);
            if (normalized.customerId) {
              setSelectedUserId(normalized.customerId);
            } else if (normalized.customerPhone) {
              const found = users.find((u) => u.phone === normalized.customerPhone);
              if (found) setSelectedUserId(found.id);
            }
          }
        } catch (error) {
          console.warn('Failed to load phone invoice', error);
        }
      })();
    }

    return () => {
      mounted = false;
    };
  }, [id, users]);

  const totals = useMemo(() => {
    const subtotal = inv.items.reduce((sum, item) => sum + (item.qty * item.unitPrice - item.discount), 0);
    const total = subtotal;
    const remaining = total - inv.payment.downPayment - inv.payment.tradeInValue;
    return { subtotal, total, remaining };
  }, [inv.items, inv.payment.downPayment, inv.payment.tradeInValue]);

  const mappedInvoice = useMemo(() => {
    return {
      id: inv.id,
      number: inv.number,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status === 'delivered' || inv.status === 'paid' ? ('paid' as const) : inv.status === 'unpaid' ? ('unpaid' as const) : inv.status === 'partial' ? ('partial' as const) : ('draft' as const),
      documentType: 'invoice' as const,
      companyType: 'circle-phone' as const,
      customer: {
        name: inv.customerName,
        phone: inv.customerPhone,
        email: inv.customerEmail || '',
        address: inv.customerAddress || '',
        pin: '',
        notes: '',
      },
      device: {
        type: inv.deviceModel || 'Device',
        storage: inv.deviceStorage || '',
        color: inv.deviceColor || '',
        imei: inv.deviceImei || '',
        complaint: '',
        diagnosis: '',
        warrantyStatus: 'Non-Garansi',
      },
      items: inv.items.map((it) => ({
        id: it.id,
        name: it.name + (it.imei ? ` (IMEI: ${it.imei})` : ''),
        description: it.description || '',
        qty: it.qty,
        unitPrice: it.unitPrice,
        discount: it.discount,
        tax: 0,
      })),
      payment: {
        downPayment: inv.payment.downPayment + (inv.payment.tradeInValue || 0),
        method: inv.payment.method,
        notes: inv.payment.notes || '',
      },
      tradeIn: inv.tradeIn
        ? {
            ...inv.tradeIn,
          }
        : undefined,
      signatures: {
        customerSignature: '',
        companySignature: '',
        customerInDate: '',
        customerOutDate: '',
        companyInDate: '',
        companyOutDate: '',
      },
      notes: inv.notes || '',
      terms: {
        warranty: 'Garansi unit 7 hari sejak pembelian.',
        general: 'Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.',
      },
      templateSettings: {
        theme: 'dark' as const,
        brandColor: '#3B82F6', // Blue for Circle Phone
        showQr: true,
        showPin: false,
        showDeviceTable: true,
        font: 'Inter',
      },
      company: {
        name: 'Circle Phone',
        tagline: 'Premium Phone & Accessories',
        email: 'circlephone.id@gmail.com',
        phone: '+62 877-3916-9797',
        address: 'Semarang, Jawa Tengah',
        brandColor: '#3B82F6',
        paymentMethods: 'BCA: 8040188042 a/n Adhitya',
        defaultTermsWarranty: '',
        defaultTermsGeneral: '',
      },
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    };
  }, [inv, totals]);

  const update = (patch: Partial<CirclePhoneInvoice>) => {
    setInv((prev) => normalizePhoneInvoice({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  };

  const updItem = (idx: number, patch: Partial<SalesItem>) => {
    setInv((prev) =>
      normalizePhoneInvoice({
        ...prev,
        items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
      }),
    );
  };

  const delItem = (idx: number) => {
    setInv((prev) => normalizePhoneInvoice({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const addItem = (type: 'device' | 'accessory') => {
    setInv((prev) =>
      normalizePhoneInvoice({
        ...prev,
        items: [
          ...prev.items,
          {
            ...BLANK_SALES_ITEM,
            id: newId(),
            itemType: type,
          },
        ],
      }),
    );
  };

  const validate = () => {
    const errs: string[] = [];
    if (!inv.customerName.trim()) errs.push('Nama customer wajib diisi');
    if (!inv.number.trim()) errs.push('Nomor invoice wajib diisi');
    if (inv.items.length === 0 || inv.items.every((i) => !i.name.trim())) errs.push('Minimal satu item');
    const hasDevice = inv.items.some((i) => i.itemType === 'device');
    if (!hasDevice) errs.push('Minimal satu device');

    if (errs.length > 0) {
      toast.error(errs.join(', '));
      return false;
    }

    return true;
  };

  const handleSave = async (silent = false) => {
    if (!validate()) return false;

    try {
      const userProfile = await findOrCreateUser(inv.customerName, inv.customerPhone, {
        email: inv.customerEmail,
        address: inv.customerAddress,
        instagram: inv.customerInstagram,
      });
      const firstDevice = inv.items.find((i) => i.itemType === 'device');
      const deviceName = firstDevice?.name || 'Device';

      const invoiceToSave = normalizePhoneInvoice({
        ...inv,
        customerId: userProfile.id,
        deviceModel: deviceName,
        payment: {
          ...inv.payment,
          remaining: totals.remaining,
        },
      });

      const savedList = await upsertPhoneInvoice(invoiceToSave);
      const saved = savedList.find((row) => row.id === invoiceToSave.id) || savedList[0] || invoiceToSave;

      setInv(normalizePhoneInvoice(saved));
      if (!silent) toast.success('Invoice Circle Phone disimpan');

      if (id === 'new') {
        nav(`/phone/${saved.id}`, { replace: true });
      }
      return true;
    } catch (error) {
      console.error('Failed to save phone invoice', error);
      toast.error('Gagal menyimpan invoice ke database');
      return false;
    }
  };

  const handlePrint = async () => {
    await handleSave(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const share = async () => {
    const text =
      `*Circle Phone* — Invoice ${inv.number}\n` +
      `Customer: ${inv.customerName}\n` +
      `Total: ${formatRupiah(totals.total)}\n` +
      `DP/Tukar Tambah: ${formatRupiah(inv.payment.downPayment + inv.payment.tradeInValue)}\n` +
      `Sisa: ${formatRupiah(totals.remaining)}\n` +
      `Status: ${inv.status}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: inv.number, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Ringkasan disalin');
      }
    } catch {}
  };

  const renderFormContent = () => (
    <Tabs defaultValue="details">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="payment">Payment & Trade-In</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Invoice</Label>
                <Input value={inv.number} onChange={(e) => update({ number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={inv.status} onValueChange={(v: any) => update({ status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="partial">Belum Lunas (DP)</SelectItem>
                    <SelectItem value="paid">Lunas</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={inv.date} onChange={(e) => update({ date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jatuh Tempo</Label>
                <Input type="date" value={inv.dueDate} onChange={(e) => update({ dueDate: e.target.value })} />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-500" /> Informasi Customer
              </h3>

              <div className="mb-4 space-y-2">
                <Label>Pilih Customer Terdaftar</Label>
                <Select value={selectedUserId} onValueChange={handleCustomerChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Tambah Customer Baru</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Customer *</Label>
                  <Input value={inv.customerName} onChange={(e) => update({ customerName: e.target.value })} placeholder="Nama lengkap" />
                </div>
                <div className="space-y-2">
                  <Label>No. HP / WhatsApp *</Label>
                  <Input value={inv.customerPhone} onChange={(e) => update({ customerPhone: e.target.value })} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={inv.customerEmail || ''} onChange={(e) => update({ customerEmail: e.target.value } as any)} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input value={inv.customerInstagram || ''} onChange={(e) => update({ customerInstagram: e.target.value } as any)} placeholder="@username" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Alamat</Label>
                  <Input value={inv.customerAddress || ''} onChange={(e) => update({ customerAddress: e.target.value } as any)} placeholder="Alamat lengkap" />
                </div>
              </div>

              {inv.customerPhone && <CustomerHistoryDisplay phone={inv.customerPhone} />}
            </div>

            <div className="space-y-2">
              <Label>Catatan Invoice</Label>
              <Textarea value={inv.notes || ''} onChange={(e) => update({ notes: e.target.value })} placeholder="Catatan tambahan..." rows={3} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="items" className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Daftar Item</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addItem('device')}>
                  <Smartphone className="h-4 w-4 mr-1" /> + Device
                </Button>
                <Button size="sm" variant="outline" onClick={() => addItem('accessory')}>
                  <Cable className="h-4 w-4 mr-1" /> + Aksesoris
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {inv.items.map((item, idx) => (
                <Card key={item.id || idx} className={item.itemType === 'device' ? 'border-blue-500/30' : 'border-gray-500/30'}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        {item.itemType === 'device' ? <Smartphone className="h-4 w-4 text-blue-500" /> : <Cable className="h-4 w-4 text-gray-500" />}
                        <span className="font-medium capitalize">{item.itemType === 'device' ? 'Device' : 'Aksesoris'}</span>
                      </div>
                      <div className="flex gap-1">
                        <Select value={item.itemType} onValueChange={(v: 'device' | 'accessory') => updItem(idx, { itemType: v })}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="device">Device</SelectItem>
                            <SelectItem value="accessory">Aksesoris</SelectItem>
                          </SelectContent>
                        </Select>
                        {inv.items.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => delItem(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Input value={item.name} onChange={(e) => updItem(idx, { name: e.target.value })} placeholder={item.itemType === 'device' ? 'Model device (ex: iPhone 15 Pro)' : 'Nama aksesoris (ex: Case Spigen)'} />
                      <Textarea value={item.description || ''} onChange={(e) => updItem(idx, { description: e.target.value })} placeholder="Deskripsi item..." rows={2} />
                    </div>

                    {item.itemType === 'device' && (
                      <div className="grid md:grid-cols-2 gap-3 p-3 bg-blue-500/5 rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-xs">IMEI / SN</Label>
                          <Input value={item.imei || ''} onChange={(e) => updItem(idx, { imei: e.target.value })} placeholder="35xxxxxxxxxxxxx" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Kapasitas</Label>
                          <Select value={item.storage || ''} onValueChange={(v) => updItem(idx, { storage: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="64GB">64 GB</SelectItem>
                              <SelectItem value="128GB">128 GB</SelectItem>
                              <SelectItem value="256GB">256 GB</SelectItem>
                              <SelectItem value="512GB">512 GB</SelectItem>
                              <SelectItem value="1TB">1 TB</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Warna</Label>
                          <Input value={item.color || ''} onChange={(e) => updItem(idx, { color: e.target.value })} placeholder="Natural Titanium" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Kondisi</Label>
                          <Select value={item.condition || ''} onValueChange={(v) => updItem(idx, { condition: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BNIB">BNIB (Baru Segel)</SelectItem>
                              <SelectItem value="Like New">Like New</SelectItem>
                              <SelectItem value="Mulus">Mulus</SelectItem>
                              <SelectItem value="Lecet">Lecet Pemakaian</SelectItem>
                              <SelectItem value="Batangan">Batangan (Minus)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" value={item.qty} onChange={(e) => updItem(idx, { qty: parseInt(e.target.value) || 0 })} min={1} />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Harga</Label>
                        <Input type="number" value={item.unitPrice} onChange={(e) => updItem(idx, { unitPrice: parseInt(e.target.value) || 0 })} placeholder="0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Disc</Label>
                        <Input type="number" value={item.discount} onChange={(e) => updItem(idx, { discount: parseInt(e.target.value) || 0 })} placeholder="0" />
                      </div>
                    </div>

                    <div className="text-right text-sm font-medium">Subtotal: {formatRupiah(item.qty * item.unitPrice - item.discount)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatRupiah(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatRupiah(totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payment" className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-500" /> Trade-In Device
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="tradein-toggle" className="text-sm">
                  Ada Trade-In?
                </Label>
                <Switch
                  id="tradein-toggle"
                  checked={showTradeIn}
                  onCheckedChange={(chk) => {
                    setShowTradeIn(chk);
                    if (!chk) {
                      update({ tradeIn: undefined, payment: { ...inv.payment, tradeInValue: 0 } });
                    } else {
                      update({ tradeIn: { ...BLANK_TRADE_IN } });
                    }
                  }}
                />
              </div>
            </div>

            {showTradeIn && inv.tradeIn && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model Trade-In</Label>
                    <Input value={inv.tradeIn.model} onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, model: e.target.value } })} placeholder="iPhone 12 Pro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kapasitas</Label>
                    <Select value={inv.tradeIn.storage} onValueChange={(v) => update({ tradeIn: { ...inv.tradeIn!, storage: v } })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kapasitas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="64GB">64 GB</SelectItem>
                        <SelectItem value="128GB">128 GB</SelectItem>
                        <SelectItem value="256GB">256 GB</SelectItem>
                        <SelectItem value="512GB">512 GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Warna</Label>
                    <Input value={inv.tradeIn.color} onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, color: e.target.value } })} placeholder="Pacific Blue" />
                  </div>
                  <div className="space-y-2">
                    <Label>IMEI / SN</Label>
                    <Input value={inv.tradeIn.imei} onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, imei: e.target.value } })} placeholder="35xxxxxxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kondisi</Label>
                    <Select value={inv.tradeIn.condition} onValueChange={(v) => update({ tradeIn: { ...inv.tradeIn!, condition: v as any } })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimasi Harga</Label>
                    <Input
                      type="number"
                      value={inv.tradeIn.estimatedPrice}
                      onChange={(e) =>
                        update({
                          tradeIn: { ...inv.tradeIn!, estimatedPrice: parseInt(e.target.value) || 0 },
                          payment: { ...inv.payment, tradeInValue: parseInt(e.target.value) || 0 },
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Catatan Trade-In</Label>
                  <Textarea value={inv.tradeIn.notes || ''} onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, notes: e.target.value } })} placeholder="Kelengkapan, minus, dll..." rows={2} />
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Nilai Trade-In: {formatRupiah(inv.tradeIn.estimatedPrice)}</div>
                </div>
              </div>
            )}

            {!showTradeIn && (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aktifkan toggle jika ada device trade-in dari customer</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" /> Pembayaran
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Select value={inv.payment.method} onValueChange={(v) => update({ payment: { ...inv.payment, method: v } })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Transfer Bank">Transfer Bank</SelectItem>
                      <SelectItem value="Tunai">Tunai</SelectItem>
                      <SelectItem value="BCA">BCA</SelectItem>
                      <SelectItem value="DANA">DANA</SelectItem>
                      <SelectItem value="OVO">OVO</SelectItem>
                      <SelectItem value="GoPay">GoPay</SelectItem>
                      <SelectItem value="ShopeePay">ShopeePay</SelectItem>
                      <SelectItem value="QRIS">QRIS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Down Payment / DP</Label>
                  <Input type="number" value={inv.payment.downPayment} onChange={(e) => update({ payment: { ...inv.payment, downPayment: parseInt(e.target.value) || 0 } })} placeholder="0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nilai Trade-In</Label>
                <Input type="number" value={inv.payment.tradeInValue} onChange={(e) => update({ payment: { ...inv.payment, tradeInValue: parseInt(e.target.value) || 0 } })} placeholder="0" disabled={!inv.tradeIn} />
                {!inv.tradeIn && <p className="text-xs text-muted-foreground">Aktifkan Trade-In di atas untuk menggunakan nilai trade-in</p>}
              </div>

              <div className="space-y-2">
                <Label>Catatan Pembayaran</Label>
                <Textarea value={inv.payment.notes || ''} onChange={(e) => update({ payment: { ...inv.payment, notes: e.target.value } })} placeholder="Catatan pembayaran..." rows={2} />
              </div>
            </div>

            <div className="border-t pt-3 space-y-2 bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span>Total Harga</span>
                <span>{formatRupiah(totals.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Down Payment</span>
                <span className="text-amber-600">-{formatRupiah(inv.payment.downPayment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Trade-In</span>
                <span className="text-purple-600">-{formatRupiah(inv.payment.tradeInValue)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Sisa Pembayaran</span>
                <span className={totals.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatRupiah(totals.remaining)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="print-page grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-4 p-4 lg:p-6 w-full">
      {/* Header and actions bar */}
      <div className="no-print lg:col-span-2 flex flex-wrap items-center justify-between gap-2 mb-2 w-full border-b pb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
          </Button>
          <div className="hidden md:block text-sm text-muted-foreground">·</div>
          <div className="font-semibold truncate max-w-[200px] md:max-w-none">{inv.number || 'Sales Baru'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={share}>
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print / Preview
          </Button>
          <Button size="sm" onClick={() => handleSave(false)}>
            <Save className="h-4 w-4 mr-1" /> Simpan
          </Button>
        </div>
      </div>

      {/* Mobile view: Form vs Preview tabs */}
      <div className="lg:hidden no-print w-full col-span-1">
        <Tabs defaultValue="form">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="form" className="gap-2">
              <FileText className="h-4 w-4" /> Form
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" /> Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="mt-3 space-y-4 w-full">
            {renderFormContent()}
          </TabsContent>
          <TabsContent value="preview" className="mt-3 w-full animate-in fade-in duration-300">
            <InvoicePreview invoice={mappedInvoice} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop view: form left, preview right */}
      <div className="hidden lg:block no-print space-y-4 w-full col-span-1">{renderFormContent()}</div>
      <div className="hidden lg:block w-full col-span-1">
        <div className="sticky top-20">
          <InvoicePreview invoice={mappedInvoice} />
        </div>
      </div>

      {/* Print-only layout */}
      <div className="print-only w-full lg:col-span-2">
        <InvoicePreview invoice={mappedInvoice} />
      </div>
    </div>
  );
}

function CustomerHistoryDisplay({ phone }: { phone: string }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const found = await getUserByPhone(phone);
        if (mounted) setUser(found);
      } catch {
        if (mounted) setUser(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [phone]);

  if (!user) return null;

  return (
    <div className="p-3 mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="text-sm">
        <span className="font-medium font-mono text-xs">Riwayat Pelanggan:</span> Service: {user.totalServices}x | Sales: {user.totalPurchases}x
      </div>
    </div>
  );
}

function normalizePhoneInvoice(value: CirclePhoneInvoice): CirclePhoneInvoice {
  return {
    ...value,
    items: Array.isArray(value.items) && value.items.length > 0 ? value.items : [{ ...BLANK_SALES_ITEM, id: newId() }],
    payment: {
      downPayment: value.payment?.downPayment ?? 0,
      tradeInValue: value.payment?.tradeInValue ?? 0,
      remaining: value.payment?.remaining ?? 0,
      method: value.payment?.method || 'Transfer Bank',
      notes: value.payment?.notes || '',
    },
  };
}
