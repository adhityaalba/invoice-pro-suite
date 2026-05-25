import * as neonPkg from '@neondatabase/serverless';

let client = null;

async function ensureClient() {
  if (client) return client;
  const conn = process.env.DATABASE_URL;
  // prefer explicit PGSSLMODE to avoid ambiguous alias behavior
  try {
    process.env.PGSSLMODE = 'verify-full';
  } catch (e) {
    // ignore
  }
  function ensureSslMode(connStr) {
    if (!connStr) return connStr;
    // normalize existing sslmode aliases to 'verify-full'
    try {
      const url = new URL(connStr);
      const params = url.searchParams;
      const ssl = params.get('sslmode');
      if (ssl) {
        const s = ssl.toLowerCase();
        if (s === 'prefer' || s === 'require' || s === 'verify-ca') {
          params.set('sslmode', 'verify-full');
          url.search = params.toString();
          return url.toString();
        }
        // if sslmode exists and is not an alias, leave as-is
        return connStr;
      }
      if (params.has('uselibpqcompat')) {
        // respect explicit libpq compatibility flag
        return connStr;
      }
      // append sslmode=verify-full preserving existing query params
      return connStr.includes('?') ? `${connStr}&sslmode=verify-full` : `${connStr}?sslmode=verify-full`;
    } catch (e) {
      // fallback to string operations if URL parsing fails
      const lower = connStr.toLowerCase();
      if (lower.includes('sslmode=')) {
        return connStr.replace(/sslmode=([^&]*)/i, 'sslmode=verify-full');
      }
      return connStr.includes('?') ? `${connStr}&sslmode=verify-full` : `${connStr}?sslmode=verify-full`;
    }
  }
  // Try Neon serverless package if it provides createClient
  try {
    const createClient = neonPkg?.createClient ?? neonPkg?.default ?? null;
    if (typeof createClient === 'function') {
      const connWithSsl = ensureSslMode(conn);
      // Some neon exports expect an options object, others accept the connection string
      try {
        client = createClient({ connectionString: connWithSsl });
      } catch (e) {
        client = createClient(connWithSsl);
      }
      return client;
    }
  } catch (e) {
    console.warn('neon createClient attempt failed', e);
  }

  // Fallback: use node-postgres (pg)
  try {
    const { Client } = await import('pg');
    const connWithSsl = ensureSslMode(conn);
    // build config object to avoid pg-connection-string parsing warning
    const url = new URL(connWithSsl);
    const config = {
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname ? url.pathname.slice(1) : undefined,
      ssl: { rejectUnauthorized: true },
    };
    const pg = new Client(config);
    await pg.connect();
    client = {
      query: (text, params) => pg.query(text, params),
    };
    return client;
  } catch (e) {
    console.error('Failed to initialise pg client', e);
    throw e;
  }
}

/**
 * Simple serverless API for invoices.
 * GET  /api/invoices       - list invoices
 * POST /api/invoices      - upsert invoice (body = invoice JSON)
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const db = await ensureClient();
      const { rows } = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const inv = req.body;
      // minimal validation
      if (!inv || !inv.id) return res.status(400).json({ error: 'missing id' });

      const db = await ensureClient();
      await db.query(
        `INSERT INTO invoices (id, number, date, due_date, status, document_type, customer, device, items, payment, signatures, notes, terms, template_settings, company, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO UPDATE SET
           number = EXCLUDED.number,
           date = EXCLUDED.date,
           due_date = EXCLUDED.due_date,
           status = EXCLUDED.status,
           document_type = EXCLUDED.document_type,
           customer = EXCLUDED.customer,
           device = EXCLUDED.device,
           items = EXCLUDED.items,
           payment = EXCLUDED.payment,
           signatures = EXCLUDED.signatures,
           notes = EXCLUDED.notes,
           terms = EXCLUDED.terms,
           template_settings = EXCLUDED.template_settings,
           company = EXCLUDED.company,
           updated_at = EXCLUDED.updated_at
        `,
        [
          inv.id,
          inv.number || null,
          inv.date ? new Date(inv.date) : null,
          inv.dueDate ? new Date(inv.dueDate) : null,
          inv.status || null,
          inv.documentType || null,
          JSON.stringify(inv.customer || {}),
          JSON.stringify(inv.device || {}),
          JSON.stringify(inv.items || []),
          JSON.stringify(inv.payment || {}),
          JSON.stringify(inv.signatures || {}),
          inv.notes || null,
          JSON.stringify(inv.terms || {}),
          JSON.stringify(inv.templateSettings || {}),
          JSON.stringify(inv.company || {}),
          inv.createdAt || new Date().toISOString(),
          inv.updatedAt || new Date().toISOString(),
        ],
      );

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error('API /api/invoices error', err);
    // expose error message in non-production logs for easier debugging
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'server_error' });
    } else {
      res.status(500).json({ error: String(err?.message || err) });
    }
  }
}
