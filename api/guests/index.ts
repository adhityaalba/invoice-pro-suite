// API Route: /api/guests
// Vercel Serverless Function for managing guest book entries

import { sql } from '../db-client';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const method = req.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/guests - List all guests
    if (method === 'GET') {
      const guests = await sql`
        SELECT * FROM guests ORDER BY created_at DESC
      `;
      return Response.json(guests, { headers: corsHeaders });
    }

    // POST /api/guests - Create guest entry
    if (method === 'POST') {
      const body = await req.json();
      const { name, phone, email, notes } = body;

      if (!name) {
        return Response.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders });
      }

      const result = await sql`
        INSERT INTO guests (name, phone, email, notes)
        VALUES (${name}, ${phone || null}, ${email || null}, ${notes || null})
        RETURNING *
      `;
      return Response.json(result[0], { headers: corsHeaders, status: 201 });
    }

    // DELETE /api/guests - Delete guest entry
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ error: 'ID is required' }, { status: 400, headers: corsHeaders });
      }

      await sql`
        DELETE FROM guests WHERE id = ${id}
      `;
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
