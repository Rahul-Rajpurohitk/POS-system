/**
 * Reset and Reseed Script
 * Truncates all relevant tables and runs the seed script fresh
 * Run with: npm run seed:reset
 *
 * WARNING: This will DELETE all data in the database!
 */

import 'dotenv/config';
import { AppDataSource, initializePostgres } from '../config/database';

async function resetAndSeed() {
  console.log('========================================');
  console.log('WARNING: This will DELETE ALL DATA!');
  console.log('========================================\n');

  try {
    // Initialize database connection
    await initializePostgres();
    console.log('Database connected.\n');

    // Tables to truncate (in order to handle foreign key constraints)
    const tablesToTruncate = [
      // Delivery system tables
      'deliveries',
      'delivery_zones',
      'online_order_queue',
      'driver_profiles',
      // Stock and inventory
      'stock_adjustments',
      'product_activity',
      'price_history',
      'product_import_jobs',
      // Delete child tables first
      'payments',
      'order_items',
      'orders',
      'gift_card_transactions',
      'gift_cards',
      'loyalty_transactions',
      'loyalty_rewards',
      'loyalty_accounts',
      'loyalty_tiers',
      'loyalty_programs',
      'cash_movements',
      'shifts',
      'eod_reports',
      'refunds',
      'stock_transfer_items',
      'stock_transfers',
      'location_inventory',
      'locations',
      'supplier_payments',
      'purchase_order_receiving_items',
      'purchase_order_receivings',
      'purchase_order_items',
      'purchase_orders',
      'supplier_products',
      'suppliers',
      'barcode_scan_logs',
      'product_batches',
      'product_barcodes',
      'sku_configurations',
      'files',
      'coupons',
      'products',
      'categories',
      'customers',
      'users',
      'businesses',
    ];

    console.log('Truncating tables...');

    // Use CASCADE to handle foreign key constraints
    for (const table of tablesToTruncate) {
      try {
        await AppDataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
        console.log(`  Truncated: ${table}`);
      } catch (error) {
        // Table might not exist, skip it
        const err = error as Error;
        if (!err.message.includes('does not exist')) {
          console.log(`  Skipped: ${table} (${err.message})`);
        }
      }
    }

    console.log('\nTables cleared. Now running seed...\n');

    // Close this connection
    await AppDataSource.destroy();

    // Run the seed script by requiring it
    // This will initialize a new connection
    require('./seed');
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

// Run reset and seed
resetAndSeed();
