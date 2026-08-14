import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

async function seed() {
  const client = new Client({
    connectionString: 'postgresql://ari_admin:ari_password_2026@127.0.0.1:5444/ari_erp_db',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // 1. Truncate tables
    console.log('🗑️ Truncating tables...');
    await client.query('TRUNCATE TABLE sale_items, sales, purchase_items, purchase_invoices, stocks, products, users, tenants CASCADE;');

    // 2. Generate password hashes
    const passwordHash = await bcrypt.hash('Admin123!', 10);

    // 3. Insert Tenant
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    console.log('🌱 Seeding tenant...');
    await client.query(`
      INSERT INTO tenants (id, company_name, tax_id, plan_type, trial_expires_at, settings, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      tenantId,
      'ARI Corp',
      'J-12345678-9',
      'EMPRENDEDOR',
      new Date('2035-12-31'),
      JSON.stringify({ allow_negative_stock: true, all_modules_enabled: true }),
      true,
    ]);

    // 4. Insert Users
    const ownerId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const cashierId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    console.log('🌱 Seeding users...');
    await client.query(`
      INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [ownerId, tenantId, 'Admin User', 'admin@ari.com', passwordHash, 'OWNER', true]);

    await client.query(`
      INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [cashierId, tenantId, 'Cajero Juan', 'juan@ari.com', passwordHash, 'CASHIER', true]);

    const superAdminId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
    await client.query(`
      INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [superAdminId, tenantId, 'Super Admin', 'superadmin@ari.com', passwordHash, 'SUPER_ADMIN', true]);

    // 5. Insert Products
    const prod1Id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    const prod2Id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    const prod3Id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
    console.log('🌱 Seeding products...');
    await client.query(`
      INSERT INTO products (id, tenant_id, sku, name, description, cost_usd, price_usd, tax_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [prod1Id, tenantId, 'PROD-001', 'Harina de Trigo', 'Harina de trigo premium 1kg', 1.80, 2.50, 12.00]);

    await client.query(`
      INSERT INTO products (id, tenant_id, sku, name, description, cost_usd, price_usd, tax_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [prod2Id, tenantId, 'PROD-002', 'Aceite de Girasol', 'Aceite de girasol 1L', 3.10, 4.20, 12.00]);

    await client.query(`
      INSERT INTO products (id, tenant_id, sku, name, description, cost_usd, price_usd, tax_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [prod3Id, tenantId, 'PROD-003', 'Azúcar Refinada', 'Azúcar blanca 1kg', 1.20, 1.80, 0.00]);

    // 6. Insert Stocks (INITIAL_LOAD)
    console.log('🌱 Seeding stocks (INITIAL_LOAD)...');
    await client.query(`
      INSERT INTO stocks (tenant_id, product_id, type, quantity, cost_at_time, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tenantId, prod1Id, 'INITIAL_LOAD', 100, 1.80, ownerId]);

    await client.query(`
      INSERT INTO stocks (tenant_id, product_id, type, quantity, cost_at_time, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tenantId, prod2Id, 'INITIAL_LOAD', 50, 3.10, ownerId]);

    await client.query(`
      INSERT INTO stocks (tenant_id, product_id, type, quantity, cost_at_time, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tenantId, prod3Id, 'INITIAL_LOAD', 10, 1.20, ownerId]);

    // 7. Insert Purchase Invoice & Items
    const purchaseId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
    console.log('🌱 Seeding purchase invoices and items...');
    await client.query(`
      INSERT INTO purchase_invoices (id, tenant_id, invoice_number, supplier_name, total_amount_usd, proof_file_path, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      purchaseId,
      tenantId,
      'FAC-4455',
      'Distribuidora Central',
      180.00,
      'comprobantes/factura_4455.pdf',
      ownerId,
    ]);

    await client.query(`
      INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost_usd)
      VALUES ($1, $2, $3, $4)
    `, [
      purchaseId,
      prod1Id,
      100,
      1.80,
    ]);

    // Also link the positive stock moves for the purchase
    await client.query(`
      INSERT INTO stocks (tenant_id, product_id, type, quantity, cost_at_time, source_type, source_id, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      tenantId,
      prod1Id,
      'PURCHASE',
      100,
      1.80,
      'PURCHASE_INVOICE',
      purchaseId,
      ownerId,
    ]);

    // 8. Insert Sales & Sale Items
    const saleId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88';
    console.log('🌱 Seeding sales and sale items...');
    await client.query(`
      INSERT INTO sales (id, tenant_id, user_id, total_amount_usd, exchange_rate_applied, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      saleId,
      tenantId,
      cashierId,
      5.00,
      1.0,
      'PAID',
    ]);

    await client.query(`
      INSERT INTO sale_items (sale_id, product_id, quantity, price_at_time_usd)
      VALUES ($1, $2, $3, $4)
    `, [
      saleId,
      prod1Id,
      2,
      2.50,
    ]);

    // Also link the negative stock moves for the sale
    await client.query(`
      INSERT INTO stocks (tenant_id, product_id, type, quantity, cost_at_time, source_type, source_id, justification, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      tenantId,
      prod1Id,
      'SALE',
      -2,
      1.80,
      'SALE',
      saleId,
      null,
      cashierId,
    ]);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await client.end();
  }
}

seed();
