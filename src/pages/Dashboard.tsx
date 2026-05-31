import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilePlus2, Search, FileText, Copy, Trash2, Eye, Smartphone, ChevronDown, Package, Users, X } from 'lucide-react';
import { deleteInvoice, loadInvoices, upsertInvoice } from '@/lib/storage-api';
import { deletePhoneInvoice, loadPhoneInvoices, upsertPhoneInvoice } from '@/lib/storage-api';
import { formatDateID, formatRupiah, formatRupiahFull, newId } from '@/lib/format';
import { calcTotals } from '@/lib/calc';
import { toast } from 'sonner';
import type { Invoice } from '@/types/invoice';
import type { CirclePhoneInvoice } from '@/types/circle-phone';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const statusColor: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  unpaid: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  draft: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
  reserved: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  delivered: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

const monthOptions = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Agt' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Okt' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Des' },
];

const yearOptions = Array.from({ length: 11 }, (_, index) => String(2026 + index));

function matchesDateFilter(date: string | undefined, monthFilter: string, yearFilter: string) {
  if (!date) return false;
  if (!monthFilter && !yearFilter) return true;

  const [year, month] = date.split('-');
  if (yearFilter && year !== yearFilter) return false;
  if (monthFilter && month !== monthFilter) return false;
  return true;
}

export default function Dashboard() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('pair');
  const [qPair, setQPair] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [pairList, setPairList] = useState<Invoice[]>([]);
  const [phoneList, setPhoneList] = useState<CirclePhoneInvoice[]>([]);

  // Load data from API on mount
  useEffect(() => {
    Promise.all([loadInvoices().then(setPairList), loadPhoneInvoices().then(setPhoneList)]).finally(() => setLoading(false));
  }, []);

  const pairByMonth = useMemo(() => {
    return pairList.filter((i) => matchesDateFilter(i.date, monthFilter, yearFilter));
  }, [monthFilter, pairList, yearFilter]);

  const phoneByMonth = useMemo(() => {
    return phoneList.filter((i) => matchesDateFilter(i.date, monthFilter, yearFilter));
  }, [monthFilter, phoneList, yearFilter]);

  const filteredPair = useMemo(() => {
    const s = qPair.trim().toLowerCase();
    if (!s) return pairList;
    return pairByMonth.filter((i) => i.number.toLowerCase().includes(s) || i.customer.name.toLowerCase().includes(s) || i.device.imei.toLowerCase().includes(s) || i.status.toLowerCase().includes(s) || i.date.includes(s));
  }, [qPair, pairByMonth]);

  const filteredPhone = useMemo(() => {
    const s = qPhone.trim().toLowerCase();
    if (!s) return phoneList;
    return phoneByMonth.filter(
      (i) => i.number.toLowerCase().includes(s) || i.customerName.toLowerCase().includes(s) || i.deviceImei.toLowerCase().includes(s) || i.status.toLowerCase().includes(s) || i.date.includes(s) || (i.tradeIn?.imei?.includes(s) ?? false),
    );
  }, [qPhone, phoneByMonth]);

  const onDeletePair = async (id: string) => {
    try {
      const next = await deleteInvoice(id);
      setPairList(next);
      toast.success('Invoice Circle Pair dihapus');
    } catch (error) {
      toast.error('Gagal menghapus invoice');
    }
  };

  const onDeletePhone = async (id: string) => {
    try {
      const next = await deletePhoneInvoice(id);
      setPhoneList(next);
      toast.success('Invoice Circle Phone dihapus');
    } catch (error) {
      toast.error('Gagal menghapus invoice');
    }
  };

  const onDuplicatePair = async (id: string) => {
    try {
      const orig = pairList.find((x) => x.id === id);
      if (!orig) return;
      const copy = { ...orig, id: newId(), number: orig.number + '-COPY', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const next = await upsertInvoice(copy);
      setPairList(next);
      toast.success('Invoice diduplikasi');
      nav(`/invoice/${copy.id}`);
    } catch (error) {
      toast.error('Gagal menduplikasi invoice');
    }
  };

  const onDuplicatePhone = async (id: string) => {
    try {
      const orig = phoneList.find((x) => x.id === id);
      if (!orig) return;
      const copy = { ...orig, id: newId(), number: orig.number + '-COPY', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const next = await upsertPhoneInvoice(copy);
      setPhoneList(next);
      toast.success('Invoice diduplikasi');
      nav(`/phone/${copy.id}`);
    } catch (error) {
      toast.error('Gagal menduplikasi invoice');
    }
  };

  const totalPairSales = useMemo(() => pairByMonth.reduce((sum, inv) => sum + calcTotals(inv).grandTotal, 0), [pairByMonth]);
  const totalPhoneSales = useMemo(
    () =>
      phoneByMonth.reduce((sum, inv) => {
        const total = inv.items.reduce((itemSum, item) => itemSum + (item.qty * item.unitPrice - item.discount), 0);
        return sum + total;
      }, 0),
    [phoneByMonth],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Kelola invoice Circle Pair (Service) & Circle Phone (Sales).</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="gap-2">
              <FilePlus2 className="h-4 w-4" /> Buat Invoice Baru <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/invoice/new" state={{ companyType: 'circle-pair' }}>
                <Smartphone className="h-4 w-4 mr-2 text-orange-500" /> Circle Pair (Service)
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/phone/new" state={{ companyType: 'circle-phone' }}>
                <Package className="h-4 w-4 mr-2 text-blue-500" /> Circle Phone (Sales)
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Circle Pair" value={pairList.length} icon={<Smartphone className="h-4 w-4" />} tone="orange" />
        <StatCard label="Circle Phone" value={phoneList.length} icon={<Package className="h-4 w-4" />} tone="blue" />
        <StatCard label="Total Pair" value={formatRupiahFull(totalPairSales)} tone="orange" />
        <StatCard label="Total Phone" value={formatRupiahFull(totalPhoneSales)} tone="blue" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pair">
            <Smartphone className="h-4 w-4 mr-2" /> Circle Pair (Service)
          </TabsTrigger>
          <TabsTrigger value="phone">
            <Package className="h-4 w-4 mr-2" /> Circle Phone (Sales)
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4">
          <div className="text-sm text-muted-foreground">Filter bulan dan tahun berlaku ke daftar dan total card.</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={monthFilter} onValueChange={(value) => setMonthFilter(value === 'all-months' ? '' : value)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-months">Semua Bulan</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={(value) => setYearFilter(value === 'all-years' ? '' : value)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-years">Semua Tahun</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setMonthFilter('');
                setYearFilter('');
              }}
              disabled={!monthFilter && !yearFilter}
              aria-label="Hapus filter bulan dan tahun"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Circle Pair Tab */}
        <TabsContent value="pair" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nomor, nama customer, IMEI, tanggal, status…" value={qPair} onChange={(e) => setQPair(e.target.value)} className="pl-9" />
          </div>

          {filteredPair.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Smartphone className="h-10 w-10 text-muted-foreground text-orange-500" />
                <div className="font-semibold">Belum ada invoice Circle Pair</div>
                <p className="text-sm text-muted-foreground">Mulai dengan membuat invoice service baru.</p>
                <Button asChild className="mt-2 gap-2">
                  <Link to="/invoice/new" state={{ companyType: 'circle-pair' }}>
                    <FilePlus2 className="h-4 w-4" /> Buat Invoice Service
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredPair.map((inv) => {
                const t = calcTotals(inv);
                return (
                  <Card key={inv.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{inv.number}</span>
                          <Badge variant="outline" className={statusColor[inv.status]}>
                            {labelStatus(inv.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">{inv.documentType === 'invoice' ? 'Invoice' : 'Service Order'}</span>
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-medium">{inv.customer.name || '—'}</span>
                          <span className="text-muted-foreground"> · </span>
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            <Smartphone className="h-3 w-3" /> {inv.device.type || '—'} {inv.device.imei && `(${inv.device.imei.slice(-6)})`}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateID(inv.date)} · {formatRupiah(t.grandTotal)} · Sisa {formatRupiah(t.remaining)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => nav(`/invoice/${inv.id}`)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Buka
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDuplicatePair(inv.id)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Duplikat
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus invoice ini?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeletePair(inv.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Circle Phone Tab */}
        <TabsContent value="phone" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nomor, nama customer, IMEI device, IMEI trade-in, tanggal, status…" value={qPhone} onChange={(e) => setQPhone(e.target.value)} className="pl-9" />
          </div>

          {filteredPhone.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Package className="h-10 w-10 text-muted-foreground text-blue-500" />
                <div className="font-semibold">Belum ada invoice Circle Phone</div>
                <p className="text-sm text-muted-foreground">Mulai dengan membuat invoice sales baru.</p>
                <Button asChild className="mt-2 gap-2">
                  <Link to="/phone/new" state={{ companyType: 'circle-phone' }}>
                    <FilePlus2 className="h-4 w-4" /> Buat Invoice Sales
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredPhone.map((inv) => {
                const total = inv.items.reduce((sum, item) => sum + (item.qty * item.unitPrice - item.discount), 0);
                const remaining = total - inv.payment.downPayment - (inv.payment.tradeInValue || 0);
                return (
                  <Card key={inv.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{inv.number}</span>
                          <Badge variant="outline" className={statusColor[inv.status]}>
                            {labelSalesStatus(inv.status)}
                          </Badge>
                          {inv.tradeIn && inv.tradeIn.model && (
                            <Badge variant="outline" className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                              Trade-In: {inv.tradeIn.model}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-medium">{inv.customerName || '—'}</span>
                          <span className="text-muted-foreground"> · </span>
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            <Package className="h-3 w-3" /> {inv.deviceModel} {inv.deviceImei && `(${inv.deviceImei.slice(-6)})`}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateID(inv.date)} · {formatRupiah(total)} · Sisa {formatRupiah(remaining)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => nav(`/phone/${inv.id}`)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Buka
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDuplicatePhone(inv.id)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Duplikat
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus invoice ini?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeletePhone(inv.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function labelStatus(s: string) {
  return { paid: 'Lunas', unpaid: 'Belum Bayar', partial: 'DP', draft: 'Draft' }[s] || s;
}

function labelSalesStatus(s: string) {
  return (
    {
      paid: 'Lunas',
      unpaid: 'Belum Bayar',
      partial: 'DP',
      draft: 'Draft',
      reserved: 'Reserved',
      delivered: 'Delivered',
    }[s] || s
  );
}

function StatCard({ label, value, tone, icon }: { label: string; value: number | string; tone?: string; icon?: React.ReactNode }) {
  const cls =
    tone === 'orange'
      ? 'text-orange-600 dark:text-orange-400'
      : tone === 'blue'
        ? 'text-blue-600 dark:text-blue-400'
        : tone === 'emerald'
          ? 'text-emerald-600 dark:text-emerald-400'
          : tone === 'amber'
            ? 'text-amber-600 dark:text-amber-400'
            : tone === 'rose'
              ? 'text-rose-600 dark:text-rose-400'
              : '';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {label}
          {icon}
        </div>
        <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
