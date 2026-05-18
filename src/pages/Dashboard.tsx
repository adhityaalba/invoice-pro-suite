import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, Search, FileText, Copy, Trash2, Eye, Smartphone } from "lucide-react";
import { deleteInvoice, loadInvoices, upsertInvoice } from "@/lib/storage";
import { formatDateID, formatRupiah, newId } from "@/lib/format";
import { calcTotals } from "@/lib/calc";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const statusColor: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  unpaid: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  partial: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  draft: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
};

export default function Dashboard() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [list, setList] = useState(() => loadInvoices());

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (i) =>
        i.number.toLowerCase().includes(s) ||
        i.customer.name.toLowerCase().includes(s) ||
        i.device.imei.toLowerCase().includes(s) ||
        i.status.toLowerCase().includes(s) ||
        i.date.includes(s)
    );
  }, [q, list]);

  const onDelete = (id: string) => {
    const next = deleteInvoice(id);
    setList(next);
    toast.success("Invoice dihapus");
  };
  const onDuplicate = (id: string) => {
    const orig = list.find((x) => x.id === id);
    if (!orig) return;
    const copy = { ...orig, id: newId(), number: orig.number + "-COPY", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = upsertInvoice(copy);
    setList(next);
    toast.success("Invoice diduplikasi");
    nav(`/invoice/${copy.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Kelola semua invoice & service order Anda.</p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/invoice/new"><FilePlus2 className="h-4 w-4" /> Buat Invoice Baru</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={list.length} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Lunas" value={list.filter((i) => i.status === "paid").length} tone="emerald" />
        <StatCard label="DP" value={list.filter((i) => i.status === "partial").length} tone="amber" />
        <StatCard label="Belum Bayar" value={list.filter((i) => i.status === "unpaid").length} tone="rose" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nomor, nama customer, IMEI, tanggal, status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div className="font-semibold">Belum ada invoice</div>
            <p className="text-sm text-muted-foreground">Mulai dengan membuat invoice baru.</p>
            <Button asChild className="mt-2"><Link to="/invoice/new"><FilePlus2 className="mr-2 h-4 w-4" />Buat Invoice</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((inv) => {
            const t = calcTotals(inv);
            return (
              <Card key={inv.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{inv.number}</span>
                      <Badge variant="outline" className={statusColor[inv.status]}>{labelStatus(inv.status)}</Badge>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        {inv.documentType === "invoice" ? "Invoice" : "Service Order"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">{inv.customer.name || "—"}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="text-muted-foreground flex items-center gap-1 inline-flex"><Smartphone className="h-3 w-3" /> {inv.device.type || "—"} {inv.device.imei && `(${inv.device.imei.slice(-6)})`}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatDateID(inv.date)} · {formatRupiah(t.grandTotal)} · Sisa {formatRupiah(t.remaining)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => nav(`/invoice/${inv.id}`)}><Eye className="h-3 w-3 mr-1" />Buka</Button>
                    <Button variant="ghost" size="sm" onClick={() => onDuplicate(inv.id)}><Copy className="h-3 w-3 mr-1" />Duplikat</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Hapus</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus invoice ini?</AlertDialogTitle>
                          <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(inv.id)}>Hapus</AlertDialogAction>
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
    </div>
  );
}

function labelStatus(s: string) {
  return { paid: "Lunas", unpaid: "Belum Bayar", partial: "DP", draft: "Draft" }[s] || s;
}
function StatCard({ label, value, tone, icon }: { label: string; value: number; tone?: string; icon?: React.ReactNode }) {
  const cls = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "";
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">{label}{icon}</div>
      <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}
