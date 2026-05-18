export const formatRupiah = (n: number) => {
  if (isNaN(n)) n = 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatDateID = (iso?: string) => {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const newId = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
