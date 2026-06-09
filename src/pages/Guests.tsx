import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Trash2, Calendar, Phone, Mail, FileText, Search, Instagram, Pencil } from 'lucide-react';
import { loadGuests, createGuest, updateGuest, deleteGuest, type GuestEntry } from '@/lib/storage-api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function Guests() {
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal state
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);

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

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setNotes('');
  };

  const handleEditClick = (guest: GuestEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(guest.id);
    setName(guest.name);
    setPhone(guest.phone ? guest.phone.replace('+62', '') : '');
    setEmail(guest.email || '');
    setInstagram(guest.instagram || '');
    setNotes(guest.notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama tamu wajib diisi!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() ? `+62${phone.trim()}` : undefined,
        email: email.trim() || undefined,
        instagram: instagram.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        const updated = await updateGuest({ id: editingId, ...payload });
        setGuests(updated);
        toast.success('Berhasil mengubah catatan tamu!');
      } else {
        const updated = await createGuest(payload);
        setGuests(updated);
        toast.success('Berhasil menambahkan catatan tamu!');
      }
      
      cancelEdit();
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
      (g.instagram && g.instagram.toLowerCase().includes(query)) ||
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
              {editingId ? 'Edit Data Pengunjung' : 'Tambah Pengunjung Baru'}
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    +62
                  </span>
                  <Input
                    id="guest-phone"
                    placeholder="8xxxxxxxxxx"
                    className="pl-10"
                    value={phone}
                    onChange={(e) => {
                      // Allow digits only, auto remove 0 or 62 or +62 at start if user pastes it
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('62')) val = val.substring(2);
                      if (val.startsWith('0')) val = val.substring(1);
                      setPhone(val);
                    }}
                    disabled={submitting}
                  />
                </div>
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
                <Label htmlFor="guest-instagram">Instagram</Label>
                <Input
                  id="guest-instagram"
                  placeholder="@username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
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

              <div className="flex gap-2">
                {editingId && (
                  <Button type="button" variant="outline" className="w-full" onClick={cancelEdit} disabled={submitting}>
                    Batal
                  </Button>
                )}
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  <UserPlus className="h-4 w-4" />
                  {submitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Kunjungan')}
                </Button>
              </div>
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
                      <TableHead>Nama</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead className="w-[50px] text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuests.map((guest) => (
                      <TableRow 
                        key={guest.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedGuest(guest)}
                      >
                        <TableCell className="font-semibold align-middle text-sm">
                          {guest.name}
                        </TableCell>
                        <TableCell className="align-middle text-xs">
                          {guest.instagram ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Instagram className="h-3.5 w-3.5 shrink-0" />
                              {guest.instagram}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => handleEditClick(guest, e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
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
                          </div>
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

      {/* Detail Modal */}
      <Dialog open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detail Tamu</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang kunjungan tamu.
            </DialogDescription>
          </DialogHeader>
          
          {selectedGuest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Waktu
                </span>
                <span className="col-span-2 text-sm">{formatDateTime(selectedGuest.createdAt)}</span>
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" /> Nama
                </span>
                <span className="col-span-2 text-sm font-semibold">{selectedGuest.name}</span>
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> No. HP
                </span>
                <span className="col-span-2 text-sm">
                  {selectedGuest.phone ? (
                    <a
                      href={`https://wa.me/+62${selectedGuest.phone.replace(/^(?:\+62|62|0)/, '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedGuest.phone.startsWith('+62') ? selectedGuest.phone : `+62${selectedGuest.phone.replace(/^(?:\+62|62|0)/, '')}`}
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> Email
                </span>
                <span className="col-span-2 text-sm">{selectedGuest.email || '—'}</span>
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Instagram className="h-4 w-4" /> Instagram
                </span>
                <span className="col-span-2 text-sm">{selectedGuest.instagram || '—'}</span>
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Catatan
                </span>
                <span className="col-span-2 text-sm whitespace-pre-wrap">{selectedGuest.notes || '—'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
