// API Route: /api/users
// Vercel Serverless Function for managing users

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

  const text = `UPDATE users SET ${parts.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
  values.push(id);

  return { text, values };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const method = req.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/users - List all users or get by phone
    if (method === 'GET') {
      const phone = url.searchParams.get('phone');

      if (phone) {
        const user = await sql`
          SELECT * FROM users WHERE phone = ${phone} LIMIT 1
        `;
        return Response.json(user[0] || null, { headers: corsHeaders });
      }

      const users = await sql`SELECT * FROM users ORDER BY created_at DESC`;
      return Response.json(users, { headers: corsHeaders });
    }

    // POST /api/users - Create new user
    if (method === 'POST') {
      const body = await req.json();
      const { name, phone, email, address, instagram, notes } = body;

      // Check if user exists
      const existing = await sql`
        SELECT * FROM users WHERE phone = ${phone} LIMIT 1
      `;

      if (existing.length > 0) {
        // Update existing user
        const updated = await sql`
          UPDATE users
          SET name = COALESCE(${name}, name),
              email = COALESCE(${email}, email),
              address = COALESCE(${address}, address),
              instagram = COALESCE(${instagram}, instagram),
              notes = COALESCE(${notes}, notes),
              updated_at = CURRENT_TIMESTAMP
          WHERE phone = ${phone}
          RETURNING *
        `;
        return Response.json(updated[0], { headers: corsHeaders });
      }

      // Create new user
      const result = await sql`
        INSERT INTO users (name, phone, email, address, instagram, notes)
        VALUES (${name}, ${phone}, ${email || null}, ${address || null}, ${instagram || null}, ${notes || null})
        RETURNING *
      `;
      return Response.json(result[0], { headers: corsHeaders, status: 201 });
    }

    // PUT /api/users - Update user
    if (method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;
      const { text, values } = buildUpdateStatement(updates, id);

      const result = await sql.query(text, values);
      return Response.json(result[0], { headers: corsHeaders });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

// Configure for Vercel
export const config = {
  runtime: 'edge',
};
