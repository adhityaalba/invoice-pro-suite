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
import { Plus, Trash2, Save, Printer, ArrowLeft, Package, Eye, Smartphone, Cable } from 'lucide-react';
import { blankPhoneInvoice, upsertPhoneInvoice, findOrCreateUser, updateUserStats, addServiceHistory, getPhoneInvoice } from '@/lib/storage-phone';
import { CONDITION_LABELS, BLANK_SALES_ITEM, BLANK_TRADE_IN, type CirclePhoneInvoice, type SalesItem } from '@/types/circle-phone';
import type { UserProfile } from '@/types/user';
import { newId, formatRupiah } from '@/lib/format';
import { toast } from 'sonner';

export default function PhoneEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState<CirclePhoneInvoice>(() => {
    if (id && id !== 'new') {
      const existing = getPhoneInvoice(id);
      if (existing) return existing;
    }
    return blankPhoneInvoice();
  });

  const [showTradeIn, setShowTradeIn] = useState(false);

  // Re-load on id change
  useEffect(() => {
    if (id && id !== 'new') {
      const e = getPhoneInvoice(id);
      if (e) {
        setInv(e);
        setShowTradeIn(!!e.tradeIn);
      }
    }
  }, [id]);

  const totals = useMemo(() => {
    const subtotal = inv.items.reduce((sum, item) => sum + (item.qty * item.unitPrice - item.discount), 0);
    const total = subtotal;
    const remaining = total - inv.payment.downPayment - inv.payment.tradeInValue;
    return { subtotal, total, remaining };
  }, [inv.items, inv.payment.downPayment, inv.payment.tradeInValue]);

  const update = (patch: Partial<CirclePhoneInvoice>) => setInv((p) => ({ ...p, ...patch, updatedAt: new Date().toISOString() }));
  const updItem = (idx: number, patch: Partial<SalesItem>) => setInv((p) => ({ ...p, items: p.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const delItem = (idx: number) => setInv((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const addItem = (type: 'device' | 'accessory') => {
    setInv((p) => ({
      ...p,
      items: [...p.items, {
        ...BLANK_SALES_ITEM,
        id: newId(),
        itemType: type,
      }]
    }));
  };

  const validate = () => {
    const errs: string[] = [];
    if (!inv.customerName.trim()) errs.push('Nama customer wajib diisi');
    if (!inv.number.trim()) errs.push('Nomor invoice wajib diisi');
    if (inv.items.length === 0 || inv.items.every((i) => !i.name.trim())) errs.push('Minimal satu item');
    const hasDevice = inv.items.some(i => i.itemType === 'device');
    if (!hasDevice) errs.push('Minimal satu device');
    if (errs.length > 0) {
      toast.error(errs.join(', '));
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    // Find or create user with additional info
    const userProfile = findOrCreateUser(inv.customerName, inv.customerPhone);

    // Update user profile with additional info if provided
    if (inv.customerEmail || inv.customerInstagram || inv.customerAddress) {
      const users = JSON.parse(localStorage.getItem('cp_users_v1') || '[]');
      const idx = users.findIndex((u: any) => u.id === userProfile.id);
      if (idx >= 0) {
        if (inv.customerEmail) users[idx].email = inv.customerEmail;
        if (inv.customerInstagram) users[idx].instagram = inv.customerInstagram;
        if (inv.customerAddress) users[idx].address = inv.customerAddress;
        users[idx].updatedAt = new Date().toISOString();
        localStorage.setItem('cp_users_v1', JSON.stringify(users));
      }
    }

    // Get first device name for description
    const firstDevice = inv.items.find(i => i.itemType === 'device');
    const deviceName = firstDevice?.name || 'Device';

    // Update invoice with customer ID and device model
    const invoiceToSave = {
      ...inv,
      customerId: userProfile.id,
      deviceModel: deviceName,
      payment: {
        ...inv.payment,
        remaining: totals.remaining,
      },
    };

    const saved = upsertPhoneInvoice(invoiceToSave);

    // Update user stats and add history
    updateUserStats(userProfile.id, 'sales');
    addServiceHistory(
      userProfile.id,
      invoiceToSave.id,
      invoiceToSave.number,
      'sales',
      invoiceToSave.date,
      deviceName,
      totals.total,
      invoiceToSave.status
    );

    toast.success('Invoice Circle Phone disimpan');
    setInv(saved);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
        <h1 className="text-xl font-bold">Circle Phone - Sales Invoice</h1>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="payment">Payment & Trade-In</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
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
                      <SelectItem value="partial">DP</SelectItem>
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
                    <Input
                      value={inv.customerEmail || ''}
                      onChange={(e) => update({ customerEmail: e.target.value } as any)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input
                      value={inv.customerInstagram || ''}
                      onChange={(e) => update({ customerInstagram: e.target.value } as any)}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Alamat</Label>
                    <Input
                      value={inv.customerAddress || ''}
                      onChange={(e) => update({ customerAddress: e.target.value } as any)}
                      placeholder="Alamat lengkap"
                    />
                  </div>
                </div>

                {/* Show customer history if exists */}
                {inv.customerPhone && (
                  <CustomerHistoryDisplay phone={inv.customerPhone} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Catatan Invoice</Label>
                <Textarea value={inv.notes || ''} onChange={(e) => update({ notes: e.target.value })} placeholder="Catatan tambahan..." rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
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
                          {item.itemType === 'device' ? (
                            <Smartphone className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Cable className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="font-medium capitalize">{item.itemType === 'device' ? 'Device' : 'Aksesoris'}</span>
                        </div>
                        <div className="flex gap-1">
                          <Select
                            value={item.itemType}
                            onValueChange={(v: 'device' | 'accessory') => updItem(idx, { itemType: v })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="device">Device</SelectItem>
                              <SelectItem value="accessory">Aksesoris</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => delItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Input
                          value={item.name}
                          onChange={(e) => updItem(idx, { name: e.target.value })}
                          placeholder={item.itemType === 'device' ? "Model device (ex: iPhone 15 Pro)" : "Nama aksesoris (ex: Case Spigen)"}
                        />
                        <Textarea
                          value={item.description || ''}
                          onChange={(e) => updItem(idx, { description: e.target.value })}
                          placeholder="Deskripsi item..."
                          rows={2}
                        />
                      </div>

                      {/* Device-specific fields */}
                      {item.itemType === 'device' && (
                        <div className="grid md:grid-cols-2 gap-3 p-3 bg-blue-500/5 rounded-lg">
                          <div className="space-y-1">
                            <Label className="text-xs">IMEI / SN</Label>
                            <Input
                              value={item.imei || ''}
                              onChange={(e) => updItem(idx, { imei: e.target.value })}
                              placeholder="35xxxxxxxxxxxxx"
                            />
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
                            <Input
                              value={item.color || ''}
                              onChange={(e) => updItem(idx, { color: e.target.value })}
                              placeholder="Natural Titanium"
                            />
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
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updItem(idx, { qty: parseInt(e.target.value) || 0 })}
                            min={1}
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs">Harga</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updItem(idx, { unitPrice: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Disc</Label>
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updItem(idx, { discount: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="text-right text-sm font-medium">
                        Subtotal: {formatRupiah(item.qty * item.unitPrice - item.discount)}
                      </div>
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

        {/* Payment & Trade-In Tab */}
        <TabsContent value="payment" className="space-y-4">
          {/* Trade-In Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-500" /> Trade-In Device
                </h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="tradein-toggle" className="text-sm">Ada Trade-In?</Label>
                  <input
                    id="tradein-toggle"
                    type="checkbox"
                    checked={showTradeIn}
                    onChange={(e) => {
                      setShowTradeIn(e.target.checked);
                      if (!e.target.checked) {
                        update({ tradeIn: undefined, payment: { ...inv.payment, tradeInValue: 0 } });
                      } else {
                        update({ tradeIn: { ...BLANK_TRADE_IN } });
                      }
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              {showTradeIn && inv.tradeIn && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Model Trade-In</Label>
                      <Input
                        value={inv.tradeIn.model}
                        onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, model: e.target.value } })}
                        placeholder="iPhone 12 Pro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kapasitas</Label>
                      <Select
                        value={inv.tradeIn.storage}
                        onValueChange={(v) => update({ tradeIn: { ...inv.tradeIn!, storage: v } })}
                      >
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
                      <Input
                        value={inv.tradeIn.color}
                        onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, color: e.target.value } })}
                        placeholder="Pacific Blue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IMEI / SN</Label>
                      <Input
                        value={inv.tradeIn.imei}
                        onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, imei: e.target.value } })}
                        placeholder="35xxxxxxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kondisi</Label>
                      <Select
                        value={inv.tradeIn.condition}
                        onValueChange={(v) => update({ tradeIn: { ...inv.tradeIn!, condition: v as any } })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estimasi Harga</Label>
                      <Input
                        type="number"
                        value={inv.tradeIn.estimatedPrice}
                        onChange={(e) => update({
                          tradeIn: { ...inv.tradeIn!, estimatedPrice: parseInt(e.target.value) || 0 },
                          payment: { ...inv.payment, tradeInValue: parseInt(e.target.value) || 0 }
                        })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan Trade-In</Label>
                    <Textarea
                      value={inv.tradeIn.notes || ''}
                      onChange={(e) => update({ tradeIn: { ...inv.tradeIn!, notes: e.target.value } })}
                      placeholder="Kelengkapan, minus, dll..."
                      rows={2}
                    />
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Nilai Trade-In: {formatRupiah(inv.tradeIn.estimatedPrice)}
                    </div>
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

          {/* Payment Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" /> Pembayaran
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Metode Pembayaran</Label>
                    <Select
                      value={inv.payment.method}
                      onValueChange={(v) => update({ payment: { ...inv.payment, method: v } })}
                    >
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
                    <Input
                      type="number"
                      value={inv.payment.downPayment}
                      onChange={(e) => update({ payment: { ...inv.payment, downPayment: parseInt(e.target.value) || 0 } })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nilai Trade-In</Label>
                  <Input
                    type="number"
                    value={inv.payment.tradeInValue}
                    onChange={(e) => update({ payment: { ...inv.payment, tradeInValue: parseInt(e.target.value) || 0 } })}
                    placeholder="0"
                    disabled={!inv.tradeIn}
                  />
                  {!inv.tradeIn && <p className="text-xs text-muted-foreground">Aktifkan Trade-In di atas untuk menggunakan nilai trade-in</p>}
                </div>

                <div className="space-y-2">
                  <Label>Catatan Pembayaran</Label>
                  <Textarea
                    value={inv.payment.notes || ''}
                    onChange={(e) => update({ payment: { ...inv.payment, notes: e.target.value } })}
                    placeholder="Catatan pembayaran..."
                    rows={2}
                  />
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
                  <span className={totals.remaining > 0 ? "text-rose-600" : "text-emerald-600"}>
                    {formatRupiah(totals.remaining)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background p-2 border-t">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Simpan
        </Button>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Preview
        </Button>
      </div>
    </div>
  );
}

// Customer history display component
function CustomerHistoryDisplay({ phone }: { phone: string }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cp_users_v1');
      if (raw) {
        const users = JSON.parse(raw);
        const found = users.find((u: any) => u.phone === phone);
        if (found) setUser(found);
      }
    } catch {}
  }, [phone]);

  if (!user) return null;

  return (
    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="text-sm">
        <span className="font-medium">History Customer:</span> Service: {user.totalServices}x | Sales: {user.totalPurchases}x
      </div>
    </div>
  );
}
