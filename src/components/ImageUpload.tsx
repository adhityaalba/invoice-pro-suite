import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface Props {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label: string;
  accept?: string;
  className?: string;
}

export default function ImageUpload({ value, onChange, label, accept = "image/*", className }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(f);
  };
  return (
    <div className={className}>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()}>
            <Upload className="mr-1 h-3 w-3" /> Pilih file
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)} className="text-destructive">
              <X className="mr-1 h-3 w-3" /> Hapus
            </Button>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}
