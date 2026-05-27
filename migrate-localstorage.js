import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

// Load from .env.local (Vercel) or .env (local)
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

console.log(`📁 Loading from ${envFile}`);
console.log('📦 Migrating localStorage data to PostgreSQL...\n');

async function migrate() {
  await client.connect();
  console.log('✅ Connected to database\n');

  // Read localStorage export if exists
  const localStorageFile = 'localStorage-export.json';
  if (!fs.existsSync(localStorageFile)) {
    console.log('📝 No localStorage export found.');
    console.log('\n📌 To migrate your existing data:');
    console.log('   1. Open your app in browser');
    console.log('   2. Open DevTools → Console');
    console.log('   3. Run this code:\n');
    console.log(`
// Export localStorage
const data = {
  invoices: JSON.parse(localStorage.getItem('cp_invoices_v1') || '[]'),
  phoneInvoices: JSON.parse(localStorage.getItem('cp_phone_invoices_v1') || '[]'),
  users: JSON.parse(localStorage.getItem('cp_users_v1') || '[]'),
  company: JSON.parse(localStorage.getItem('cp_company_v1') || '{}'),
  history: JSON.parse(localStorage.getItem('cp_service_history_v1') || '[]'),
};
copy(data); paste to localStorage-export.json file
    `);
    console.log('\n   4. Save the output as localStorage-export.json');
    console.log('   5. Run: node migrate-localstorage.js\n');
    await client.end();
    return;
  }

  const data = JSON.parse(fs.readFileSync(localStorageFile, 'utf8'));

  // Migrate users
  if (data.users && data.users.length > 0) {
    console.log(`👤 Migrating ${data.users.length} users...`);
    for (const user of data.users) {
      try {
        await client.query(`
          INSERT INTO users (id, name, phone, email, address, instagram, notes, total_services, total_purchases, last_visit, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (phone) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, users.name),
            email = COALESCE(EXCLUDED.email, users.email),
            updated_at = CURRENT_TIMESTAMP
        `, [
          user.id || generateUUID(),
          user.name,
          user.phone,
          user.email || null,
          user.address || null,
          user.instagram || null,
          user.notes || null,
          user.totalServices || 0,
          user.totalPurchases || 0,
          user.lastVisit || null,
          user.createdAt || new Date().toISOString(),
          user.updatedAt || new Date().toISOString(),
        ]);
      } catch (e) {
        console.log(`   ⚠️  Skipped user ${user.phone}: ${e.message}`);
      }
    }
    console.log(`   ✅ Users migrated\n`);
  }

  // Migrate Circle Pair invoices
  if (data.invoices && data.invoices.length > 0) {
    console.log(`🔧 Migrating ${data.invoices.length} Circle Pair invoices...`);
    for (const inv of data.invoices) {
      try {
        const userId = await getUserId(inv.customer.phone);
        const invId = inv.id || generateUUID();

        // Insert invoice
        await client.query(`
          INSERT INTO circle_pair_invoices (
            id, number, customer_id, customer_name, customer_phone, customer_email, customer_address,
            customer_pin, customer_notes, device_type, device_storage, device_color, device_imei,
            device_complaint, device_diagnosis, device_warranty_status, date, due_date, status,
            document_type, subtotal, discount_total, tax_total, grand_total, down_payment,
            remaining_amount, notes, terms_warranty, terms_general, template_settings,
            company_name, company_email, company_phone, company_address, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38
          )
          ON CONFLICT (id) DO NOTHING
        `, [
          invId, inv.number, userId, inv.customer.name, inv.customer.phone, inv.customer.email || null,
          inv.customer.address || null, inv.customer.pin || null, inv.customer.notes || null,
          inv.device.type, inv.device.storage, inv.device.color, inv.device.imei,
          inv.device.complaint, inv.device.diagnosis, inv.device.warrantyStatus,
          inv.date, inv.dueDate, inv.status, inv.documentType,
          0, 0, 0, 0, inv.payment.downPayment, 0,
          inv.notes, inv.terms.warranty, inv.terms.general,
          JSON.stringify(inv.templateSettings), inv.company.name, inv.company.email,
          inv.company.phone, inv.company.address, inv.createdAt, inv.updatedAt,
        ]);

        // Insert items
        for (const item of inv.items) {
          await client.query(`
            INSERT INTO circle_pair_items (id, invoice_id, name, description, qty, unit_price, discount, tax_percent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT DO NOTHING
          `, [item.id || generateUUID(), invId, item.name, item.description, item.qty, item.unitPrice, item.discount, item.tax]);
        }
      } catch (e) {
        console.log(`   ⚠️  Skipped invoice ${inv.number}: ${e.message}`);
      }
    }
    console.log(`   ✅ Circle Pair invoices migrated\n`);
  }

  // Migrate Circle Phone invoices
  if (data.phoneInvoices && data.phoneInvoices.length > 0) {
    console.log(`📱 Migrating ${data.phoneInvoices.length} Circle Phone invoices...`);
    for (const inv of data.phoneInvoices) {
      try {
        const userId = await getUserId(inv.customerPhone);
        const invId = inv.id || generateUUID();

        await client.query(`
          INSERT INTO circle_phone_invoices (
            id, number, customer_id, customer_name, customer_phone, customer_email, customer_address,
            customer_instagram, date, due_date, status, subtotal, down_payment, trade_in_value,
            remaining_amount, payment_method, payment_notes, notes, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          )
          ON CONFLICT (id) DO NOTHING
        `, [
          invId, inv.number, userId, inv.customerName, inv.customerPhone, inv.customerEmail || null,
          inv.customerAddress || null, inv.customerInstagram || null, inv.date, inv.dueDate, inv.status,
          0, inv.payment.downPayment, inv.payment.tradeInValue, inv.payment.remaining,
          inv.payment.method, inv.payment.notes, inv.notes, inv.createdAt, inv.updatedAt,
        ]);

        // Insert items
        for (const item of inv.items) {
          await client.query(`
            INSERT INTO circle_phone_items (id, invoice_id, item_type, name, description, qty, unit_price, discount, imei, storage, color, condition)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT DO NOTHING
          `, [
            item.id || generateUUID(), invId, item.itemType, item.name, item.description,
            item.qty, item.unitPrice, item.discount, item.imei || null, item.storage || null,
            item.color || null, item.condition || null
          ]);
        }

        // Insert trade-in
        if (inv.tradeIn && inv.tradeIn.model) {
          await client.query(`
            INSERT INTO circle_phone_trade_ins (invoice_id, model, storage, color, imei, condition, estimated_price, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT DO NOTHING
          `, [invId, inv.tradeIn.model, inv.tradeIn.storage, inv.tradeIn.color, inv.tradeIn.imei, inv.tradeIn.condition, inv.tradeIn.estimatedPrice, inv.tradeIn.notes]);
        }
      } catch (e) {
        console.log(`   ⚠️  Skipped invoice ${inv.number}: ${e.message}`);
      }
    }
    console.log(`   ✅ Circle Phone invoices migrated\n`);
  }

  console.log('✅ Migration completed! Check your database.\n');
  await client.end();
}

async function getUserId(phone) {
  const result = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
  return result.rows[0]?.id || null;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

migrate().catch(console.error);
