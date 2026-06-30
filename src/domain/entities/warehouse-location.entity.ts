/**
 * WarehouseLocation Entity
 * Purpose: Industrial WMS hierarchical locations.
 * Standard: Recursive Tree (ST-5.1)
 */
export enum LocationType {
  WAREHOUSE = 'WAREHOUSE',
  AISLE = 'AISLE',
  SHELF = 'SHELF',
  BIN = 'BIN',
}

export class WarehouseLocation {
  id: string;
  tenant_id: string;
  parent_id?: string;
  name: string;
  type: LocationType;
  capacity_limit: number;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<WarehouseLocation>) {
    Object.assign(this, partial);
  }
}
