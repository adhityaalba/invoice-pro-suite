# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (runs on port 8080)
- `npm run build` - Build for production
- `npm run build:dev` - Build for development mode
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest tests once
- `npm run test:watch` - Run Vitest in watch mode

## Tech Stack & Architecture

This is a **gadget service invoice management system** built as a single-page React application with localStorage persistence.

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite (with SWC for fast compilation)
- **UI Library**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query) for server-state-like caching of localStorage data
- **Testing**: Vitest + jsdom + Testing Library
- **Build Tool**: Vite (with custom port 8080, HMR overlay disabled)

### Key Architectural Patterns

**Domain Model** (`src/types/invoice.ts`)
- Core entity is `Invoice` with nested objects: `Customer`, `Device`, `InvoiceItem[]`, `Payment`, `Signatures`, `CompanyProfile`, `TemplateSettings`
- Supports both invoices and service orders (`documentType`)
- Indonesian default terms and formatting

**Persistence Layer** (`src/lib/storage.ts`)
- All data stored in localStorage with versioned keys (`cp_invoices_v1`, `cp_company_v1`)
- Automatic seeding on first load with demo invoice
- CRUD operations: `loadInvoices`, `saveInvoices`, `upsertInvoice`, `deleteInvoice`, `getInvoice`
- Company profile stored separately and merged with defaults

**Calculation Logic** (`src/lib/calc.ts`)
- `itemSubtotal()` - Per-item calc with qty × price - discount + tax
- `calcTotals()` - Invoice-level totals (subtotal, discount, tax, grand total, down payment, remaining)
- Tax is applied **after** line-item discounts

**Formatting** (`src/lib/format.ts`)
- `formatRupiah()` - Indonesian currency formatting
- `formatDateID()` - Indonesian date formatting
- `newId()` - UUID generation
- `todayISO()` - Current date as ISO string

**Invoice Seeding** (`src/lib/seed.ts`)
- `blankInvoice()` - Creates new invoice with pre-populated defaults
- `newInvoiceNumber()` - Generates invoice numbers like `CP-20260518-123`
- `seedInvoice()` - Demo data for first-run experience

### Application Structure

**Routing** (`src/App.tsx`)
- `<AppLayout>` wrapper for authenticated-like layout
- Routes: `/` (Dashboard), `/invoice/new`, `/invoice/:id` (InvoiceEditor), `/settings`
- Dark theme forced by default
- QueryClient wraps app with TanStack Query

**Pages**
- `Dashboard` - Invoice list with search, filters, status badges
- `InvoiceEditor` - Multi-tab form (Details, Items, Payment, Preview)
- `Settings` - Company profile management
- `NotFound` - 404 page

**Components**
- `InvoicePreview` - Printable invoice template with custom layout
- `SignaturePad` - Canvas-based signature capture (dataURL storage)
- `ImageUpload` - Logo/QR code upload (dataURL storage)
- `AppLayout` - Navigation layout
- `/components/ui/` - shadcn/ui components (do not modify manually, use `npx shadcn-ui@latest add`)

### State Management Pattern

Pages use React state with localStorage synchronization:
```tsx
const [list, setList] = useState(() => loadInvoices());
const onUpdate = (data) => {
  const next = upsertInvoice(data); // saves to localStorage
  setList(next); // updates local state
};
```

### Styling & Theming

- Tailwind CSS with CSS variables for theming (`--doc-bg`, `--doc-surface`, `--doc-foreground`)
- Invoice templates use print-specific styles (A4 aspect ratio, fixed width)
- All UI components use shadcn/ui class variance system (`class-variance-authority`)
- Dark theme is the default and primary theme

### Testing

- Vitest with jsdom environment
- Test setup in `src/test/setup.ts` (includes matchMedia polyfill)
- Tests placed alongside source files: `*.test.ts` or `*.spec.ts`
- Testing Library for React component testing

## Important Business Logic

- **Invoice numbering**: Format is `CP-YYYYMMDD-NNN` (company prefix + date + random)
- **Status flow**: draft → unpaid/partial → paid (but any status can be set manually)
- **Payment tracking**: `downPayment` + remaining balance calculation
- **Device IMEI**: Tracked for warranty claims
- **Signatures**: Four signature/date fields (customer in/out, company in/out)
- **Default terms**: Indonesian warranty and general terms stored in `DEFAULT_TERMS_*` constants

## Development Notes

- The app uses `@` alias for `./src` directory
- ESLint is configured with TypeScript, React Hooks, and React Refresh rules
- `@typescript-eslint/no-unused-vars` is disabled
- All currency calculations round to integers (no cents/decimal places)
- Images stored as dataURL in localStorage (warn about storage limits)
- Dev server runs on port 8080 with HMR (overlay disabled for cleaner output)
