import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Trash2, Calendar, Phone, Mail, FileText, Search } from 'lucide-react';
import { loadGuests, createGuest, deleteGuest, type GuestEntry } from '@/lib/storage-api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Guests() {
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGuests()
      .then((list) => {
        setGuests(list);
      })
      .catch((err) => {
        console.error('Gagal memuat daftar tamu', err);
        toast.error('Gagal memuat daftar tamu');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama tamu wajib diisi!');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await createGuest({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setGuests(updated);
      toast.success('Berhasil menambahkan catatan tamu!');
      
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
    } catch (err) {
      toast.error('Gagal menyimpan catatan tamu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await deleteGuest(id);
      setGuests(updated);
      toast.success('Catatan tamu berhasil dihapus');
    } catch (err) {
      toast.error('Gagal menghapus catatan tamu');
    }
  };

  const filteredGuests = guests.filter((g) => {
    const query = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(query) ||
      (g.phone && g.phone.includes(query)) ||
      (g.email && g.email.toLowerCase().includes(query)) ||
      (g.notes && g.notes.toLowerCase().includes(query))
    );
  });

  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Buku Tamu</h1>
        <p className="text-sm text-muted-foreground">Catat dan kelola riwayat tamu / pengunjung yang datang ke toko.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Form */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Tambah Pengunjung Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="guest-name">Nama Tamu *</Label>
                <Input
                  id="guest-name"
                  placeholder="Nama lengkap tamu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest-phone">No. HP / WhatsApp</Label>
                <Input
                  id="guest-phone"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest-email">Email</Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest-notes">Keperluan / Catatan</Label>
                <Textarea
                  id="guest-notes"
                  placeholder="Keterangan kunjungan tamu..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Menyimpan...' : 'Simpan Kunjungan'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Guest List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Daftar Tamu ({filteredGuests.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari tamu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">Memuat data tamu...</div>
            ) : filteredGuests.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {searchQuery ? 'Tidak ada data tamu yang cocok.' : 'Belum ada tamu hari ini.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Waktu Datang</TableHead>
                      <TableHead className="w-[180px]">Nama</TableHead>
                      <TableHead className="w-[200px]">Kontak</TableHead>
                      <TableHead>Keperluan / Catatan</TableHead>
                      <TableHead className="w-[50px] text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuests.map((guest) => (
                      <TableRow key={guest.id}>
                        <TableCell className="font-medium align-top text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {formatDateTime(guest.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold align-top text-sm">
                          {guest.name}
                        </TableCell>
                        <TableCell className="align-top space-y-1 text-xs">
                          {guest.phone && (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              {guest.phone}
                            </span>
                          )}
                          {guest.email && (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              {guest.email}
                            </span>
                          )}
                          {!guest.phone && !guest.email && <span className="text-slate-500">—</span>}
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground whitespace-pre-wrap max-w-xs break-words">
                          {guest.notes || <span className="italic text-slate-500">tidak ada catatan</span>}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/15">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus catatan kunjungan?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tindakan ini akan menghapus data tamu {guest.name} secara permanen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(guest.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
