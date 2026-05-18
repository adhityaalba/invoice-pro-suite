import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/ImageUpload";
import { loadCompany, saveCompany } from "@/lib/storage";
import type { CompanyProfile } from "@/types/invoice";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function Settings() {
  const [c, setC] = useState<CompanyProfile>(() => loadCompany());
  const upd = (k: keyof CompanyProfile, v: any) => setC((p) => ({ ...p, [k]: v }));
  const save = () => { saveCompany(c); toast.success("Pengaturan tersimpan"); };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pengaturan Perusahaan</h1>
          <p className="text-sm text-muted-foreground">Profil default akan digunakan saat membuat invoice baru.</p>
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-1" />Simpan</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Identitas</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <Field label="Nama Perusahaan"><Input value={c.name} onChange={(e) => upd("name", e.target.value)} /></Field>
          <Field label="Tagline"><Input value={c.tagline || ""} onChange={(e) => upd("tagline", e.target.value)} /></Field>
          <Field label="Email"><Input value={c.email} onChange={(e) => upd("email", e.target.value)} /></Field>
          <Field label="Telepon"><Input value={c.phone} onChange={(e) => upd("phone", e.target.value)} /></Field>
          <Field label="Alamat" className="md:col-span-2"><Textarea rows={2} value={c.address} onChange={(e) => upd("address", e.target.value)} /></Field>
          <ImageUpload label="Logo" value={c.logo} onChange={(v) => upd("logo", v)} />
          <ImageUpload label="QR Pembayaran" value={c.qrImage} onChange={(v) => upd("qrImage", v)} />
          <Field label="Warna Brand">
            <div className="flex gap-2">
              <Input type="color" value={c.brandColor} onChange={(e) => upd("brandColor", e.target.value)} className="w-16 h-10 p-1" />
              <Input value={c.brandColor} onChange={(e) => upd("brandColor", e.target.value)} />
            </div>
          </Field>
          <Field label="Metode Pembayaran" className="md:col-span-2"><Textarea rows={3} value={c.paymentMethods} onChange={(e) => upd("paymentMethods", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Syarat & Ketentuan Default</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <Field label="Under Warranty"><Textarea rows={8} value={c.defaultTermsWarranty} onChange={(e) => upd("defaultTermsWarranty", e.target.value)} /></Field>
          <Field label="General"><Textarea rows={8} value={c.defaultTermsGeneral} onChange={(e) => upd("defaultTermsGeneral", e.target.value)} /></Field>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children, className = "" }: any) {
  return <div className={`space-y-1 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
