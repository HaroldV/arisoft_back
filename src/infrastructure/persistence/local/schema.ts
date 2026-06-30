import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB Schema
 * Purpose: Local-First persistence for ARI POS (T4.1.2).
 */
export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'products',
      columns: [
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'price_usd', type: 'number' },
        { name: 'cost_usd', type: 'number' },
        { name: 'tax_rate', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'cart_items',
      columns: [
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price', type: 'number' },
        { name: 'tenant_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
});
