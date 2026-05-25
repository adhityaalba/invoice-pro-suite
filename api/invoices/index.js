import { createClient } from '@neondatabase/serverless';

const client = createClient({ connectionString: process.env.DATABASE_URL });

/**
 * Simple serverless API for invoices.
 * GET  /api/invoices       - list invoices
 * POST /api/invoices      - upsert invoice (body = invoice JSON)
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await client.query('SELECT * FROM invoices ORDER BY created_at DESC');
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const inv = req.body;
      // minimal validation
      if (!inv || !inv.id) return res.status(400).json({ error: 'missing id' });

      await client.query(
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
