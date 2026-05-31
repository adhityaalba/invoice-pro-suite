// API Route: /api/circle-pair
// Vercel Serverless Function for Circle Pair (Service) invoices

import { sql } from '../db-client';

function buildUpdateStatement(updates: Record<string, any>, id: string) {
  const entries = Object.entries(updates);
  const parts: string[] = [];
  const values: any[] = [];

  entries.forEach(([key, value], index) => {
    const dbColumn = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    parts.push(`${dbColumn} = $${index + 1}`);
    values.push(value);
  });

  const text = `UPDATE circle_pair_invoices SET ${parts.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
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
    // GET /api/circle-pair - List all invoices or get by ID
    if (method === 'GET') {
      const id = url.searchParams.get('id');

      if (id) {
        // Get single invoice with items and signatures
        const invoice = await sql`
          SELECT * FROM circle_pair_invoices WHERE id = ${id}
        `;

        if (invoice.length === 0) {
          return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
        }

        const items = await sql`
          SELECT * FROM circle_pair_items WHERE invoice_id = ${id}
        `;

        const signatures = await sql`
          SELECT * FROM circle_pair_signatures WHERE invoice_id = ${id}
        `;

        return Response.json(
          {
            ...invoice[0],
            items,
            signatures: signatures[0] || {},
          },
          { headers: corsHeaders },
        );
      }

      const invoices = await sql`
        SELECT * FROM circle_pair_invoices
        ORDER BY date DESC, created_at DESC
      `;

      return Response.json(invoices, { headers: corsHeaders });
    }

    // POST /api/circle-pair - Create new invoice
    if (method === 'POST') {
      const body = await req.json();

      const {
        number,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerPin,
        customerNotes,
        deviceType,
        deviceStorage,
        deviceColor,
        deviceImei,
        deviceComplaint,
        deviceDiagnosis,
        deviceWarrantyStatus,
        date,
        dueDate,
        status,
        documentType,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        downPayment,
        remainingAmount,
        notes,
        termsWarranty,
        termsGeneral,
        templateSettings,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        items,
        signatures,
      } = body;

      // Start transaction
      const result = await sql`
        INSERT INTO circle_pair_invoices (
          number, customer_id, customer_name, customer_phone, customer_email, customer_address,
          customer_pin, customer_notes, device_type, device_storage, device_color, device_imei,
          device_complaint, device_diagnosis, device_warranty_status, date, due_date, status,
          document_type, subtotal, discount_total, tax_total, grand_total, down_payment,
          remaining_amount, notes, terms_warranty, terms_general, template_settings,
          company_name, company_email, company_phone, company_address
        )
        VALUES (
          ${number}, ${customerId || null}, ${customerName}, ${customerPhone}, ${customerEmail || null}, ${customerAddress || null},
          ${customerPin || null}, ${customerNotes || null}, ${deviceType || null}, ${deviceStorage || null}, ${deviceColor || null}, ${deviceImei || null},
          ${deviceComplaint || null}, ${deviceDiagnosis || null}, ${deviceWarrantyStatus || null}, ${date}, ${dueDate}, ${status},
          ${documentType}, ${subtotal || 0}, ${discountTotal || 0}, ${taxTotal || 0}, ${grandTotal || 0}, ${downPayment || 0},
          ${remainingAmount || 0}, ${notes || null}, ${termsWarranty || null}, ${termsGeneral || null}, ${templateSettings || null}::jsonb,
          ${companyName || null}, ${companyEmail || null}, ${companyPhone || null}, ${companyAddress || null}
        )
        RETURNING *
      `;

      const invoiceId = result[0].id;

      // Insert items
      if (items && items.length > 0) {
        for (const item of items) {
          await sql`
            INSERT INTO circle_pair_items (invoice_id, name, description, qty, unit_price, discount, tax_percent)
            VALUES (${invoiceId}, ${item.name}, ${item.description || null}, ${item.qty}, ${item.unitPrice}, ${item.discount || 0}, ${item.tax || 0})
          `;
        }
      }

      // Insert signatures
      if (signatures) {
        await sql`
          INSERT INTO circle_pair_signatures (
            invoice_id, customer_signature, company_signature,
            customer_in_date, customer_out_date, company_in_date, company_out_date
          )
          VALUES (
            ${invoiceId}, ${signatures.customerSignature || null}, ${signatures.companySignature || null},
            ${signatures.customerInDate || null}, ${signatures.customerOutDate || null},
            ${signatures.companyInDate || null}, ${signatures.companyOutDate || null}
          )
        `;
      }

      // Update user stats
      if (customerId) {
        await sql`
          UPDATE users
          SET total_services = total_services + 1,
              last_visit = ${date}
          WHERE id = ${customerId}
        `;
      }

      return Response.json(result[0], { status: 201, headers: corsHeaders });
    }

    // PUT /api/circle-pair - Update invoice
    if (method === 'PUT') {
      const body = await req.json();
      const { id, items, signatures, ...updates } = body;
      const { text, values } = buildUpdateStatement(updates, id);

      const result = await sql.query(text, values);

      if (result.length === 0) {
        return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
      }

      // Delete and re-insert items
      if (items !== undefined) {
        await sql`DELETE FROM circle_pair_items WHERE invoice_id = ${id}`;
        for (const item of items) {
          await sql`
            INSERT INTO circle_pair_items (invoice_id, name, description, qty, unit_price, discount, tax_percent)
            VALUES (${id}, ${item.name}, ${item.description || null}, ${item.qty}, ${item.unitPrice}, ${item.discount || 0}, ${item.tax || 0})
          `;
        }
      }

      // Update signatures
      if (signatures !== undefined) {
        await sql`DELETE FROM circle_pair_signatures WHERE invoice_id = ${id}`;
        await sql`
          INSERT INTO circle_pair_signatures (
            invoice_id, customer_signature, company_signature,
            customer_in_date, customer_out_date, company_in_date, company_out_date
          )
          VALUES (
            ${id}, ${signatures.customerSignature || null}, ${signatures.companySignature || null},
            ${signatures.customerInDate || null}, ${signatures.customerOutDate || null},
            ${signatures.companyInDate || null}, ${signatures.companyOutDate || null}
          )
        `;
      }

      return Response.json(result[0], { headers: corsHeaders });
    }

    // DELETE /api/circle-pair - Delete invoice
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');

      if (!id) {
        return Response.json({ error: 'ID required' }, { status: 400, headers: corsHeaders });
      }

      await sql`DELETE FROM circle_pair_invoices WHERE id = ${id}`;

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
