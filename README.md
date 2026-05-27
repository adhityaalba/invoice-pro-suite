# Invoice Pro Suite

Aplikasi React + Vite untuk Circle Pair dan Circle Phone dengan backend PostgreSQL lokal/Neon.

## Jalankan di lokal

1. Pastikan PostgreSQL sudah hidup di laptop Anda dan `DATABASE_URL` sudah sesuai.
2. Buat file `.env` atau `.env.local` jika perlu. Contoh untuk PostgreSQL lokal:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/circlephone_db
```

3. Jalankan migrasi skema:

```bash
npm run migrate
```

4. Jalankan aplikasi:

```bash
npm run dev
```

Command ini menyalakan frontend Vite dan proxy API lokal. Buka aplikasi di `http://localhost:3000`.

## Catatan

- `npm run dev:frontend` menjalankan Vite di port `8081`.
- `npm run dev:api` menjalankan proxy API lokal yang membaca route di folder `api/`.
- `npm run migrate:localstorage` dipakai kalau Anda ingin memindahkan data export dari localStorage ke PostgreSQL.
