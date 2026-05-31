// API Route: /api/circle-phone
// Vercel Serverless Function for Circle Phone (Sales) invoices

import { sql } from '../db-client.ts';

function buildUpdateStatement(updates: Record<string, any>, id: string) {
  const entries = Object.entries(updates);
  const parts: string[] = [];
  const values: any[] = [];

  entries.forEach(([key, value], index) => {
    const dbColumn = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    parts.push(`${dbColumn} = $${index + 1}`);
    values.push(value);
  });

  const text = `UPDATE circle_phone_invoices SET ${parts.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
  values.push(id);

  return { text, values };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const method = req.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/circle-phone - List all invoices or get by ID
    if (method === 'GET') {
      const id = url.searchParams.get('id');

      if (id) {
        const invoice = await sql`
          SELECT * FROM circle_phone_invoices WHERE id = ${id}
        `;

        if (invoice.length === 0) {
          return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
        }

        const items = await sql`
          SELECT * FROM circle_phone_items WHERE invoice_id = ${id}
        `;

        const tradeIn = await sql`
          SELECT * FROM circle_phone_trade_ins WHERE invoice_id = ${id}
        `;

        return Response.json(
          {
            ...invoice[0],
            items,
            tradeIn: tradeIn[0] || null,
          },
          { headers: corsHeaders },
        );
      }

      const invoices = await sql`
        SELECT * FROM circle_phone_invoices
        ORDER BY date DESC, created_at DESC
      `;

      return Response.json(invoices, { headers: corsHeaders });
    }

    // POST /api/circle-phone - Create new invoice
    if (method === 'POST') {
      const body = await req.json();

      const {
        number,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerInstagram,
        date,
        dueDate,
        status,
        subtotal,
        downPayment,
        tradeInValue,
        remainingAmount,
        paymentMethod,
        paymentNotes,
        notes,
        items,
        tradeIn,
      } = body;

      // Insert invoice
      const result = await sql`
        INSERT INTO circle_phone_invoices (
          number, customer_id, customer_name, customer_phone, customer_email,
          customer_address, customer_instagram, date, due_date, status,
          subtotal, down_payment, trade_in_value, remaining_amount,
          payment_method, payment_notes, notes
        )
        VALUES (
          ${number}, ${customerId || null}, ${customerName}, ${customerPhone}, ${customerEmail || null},
          ${customerAddress || null}, ${customerInstagram || null}, ${date}, ${dueDate}, ${status},
          ${subtotal || 0}, ${downPayment || 0}, ${tradeInValue || 0}, ${remainingAmount || 0},
          ${paymentMethod}, ${paymentNotes || null}, ${notes || null}
        )
        RETURNING *
      `;

      const invoiceId = result[0].id;

      // Insert items
      if (items && items.length > 0) {
        for (const item of items) {
          await sql`
            INSERT INTO circle_phone_items (
              invoice_id, item_type, name, description, qty, unit_price, discount,
              imei, storage, color, condition
            )
            VALUES (
              ${invoiceId}, ${item.itemType}, ${item.name}, ${item.description || null}, ${item.qty},
              ${item.unitPrice}, ${item.discount || 0}, ${item.imei || null}, ${item.storage || null},
              ${item.color || null}, ${item.condition || null}
            )
          `;
        }
      }

      // Insert trade-in
      if (tradeIn && tradeIn.model) {
        await sql`
          INSERT INTO circle_phone_trade_ins (
            invoice_id, model, storage, color, imei, condition, estimated_price, notes
          )
          VALUES (
            ${invoiceId}, ${tradeIn.model}, ${tradeIn.storage || null}, ${tradeIn.color || null},
            ${tradeIn.imei || null}, ${tradeIn.condition}, ${tradeIn.estimatedPrice || 0}, ${tradeIn.notes || null}
          )
        `;
      }

      // Add to service history
      const firstDevice = items?.find((i: any) => i.itemType === 'device');
      const deviceName = firstDevice?.name || 'Device';

      if (customerId) {
        await sql`
          INSERT INTO service_history (user_id, invoice_id, invoice_number, type, date, device_model, amount, status)
          VALUES (${customerId}, ${invoiceId}, ${number}, 'sales', ${date}, ${deviceName}, ${subtotal || 0}, ${status})
        `;

        await sql`
          UPDATE users
          SET total_purchases = total_purchases + 1,
              last_visit = ${date}
          WHERE id = ${customerId}
        `;
      }

      return Response.json(result[0], { status: 201, headers: corsHeaders });
    }

    // PUT /api/circle-phone - Update invoice
    if (method === 'PUT') {
      const body = await req.json();
      const { id, items, tradeIn, ...updates } = body;
      const { text, values } = buildUpdateStatement(updates, id);

      const result = await sql.query(text, values);

      if (result.length === 0) {
        return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
      }

      // Update items
      if (items !== undefined) {
        await sql`DELETE FROM circle_phone_items WHERE invoice_id = ${id}`;
        for (const item of items) {
          await sql`
            INSERT INTO circle_phone_items (
              invoice_id, item_type, name, description, qty, unit_price, discount,
              imei, storage, color, condition
            )
            VALUES (
              ${id}, ${item.itemType}, ${item.name}, ${item.description || null}, ${item.qty},
              ${item.unitPrice}, ${item.discount || 0}, ${item.imei || null}, ${item.storage || null},
              ${item.color || null}, ${item.condition || null}
            )
          `;
        }
      }

      // Update trade-in
      if (tradeIn !== undefined) {
        await sql`DELETE FROM circle_phone_trade_ins WHERE invoice_id = ${id}`;
        if (tradeIn && tradeIn.model) {
          await sql`
            INSERT INTO circle_phone_trade_ins (
              invoice_id, model, storage, color, imei, condition, estimated_price, notes
            )
            VALUES (
              ${id}, ${tradeIn.model}, ${tradeIn.storage || null}, ${tradeIn.color || null},
              ${tradeIn.imei || null}, ${tradeIn.condition}, ${tradeIn.estimatedPrice || 0}, ${tradeIn.notes || null}
            )
          `;
        }
      }

      return Response.json(result[0], { headers: corsHeaders });
    }

    // DELETE /api/circle-phone - Delete invoice
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');

      if (!id) {
        return Response.json({ error: 'ID required' }, { status: 400, headers: corsHeaders });
      }

      await sql`DELETE FROM circle_phone_invoices WHERE id = ${id}`;

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal server error', details: String(error) }, { status: 500, headers: corsHeaders });
  }
}

export const config = {
  runtime: 'edge',
};
