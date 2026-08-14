import { CommercialDocumentType } from '../../../../domain/entities/commercial-document.entity';

export interface CommercialDocumentItemDto {
  product_id?: string;
  product_name: string;
  sku?: string;
  unit_price_usd: number;
  quantity: number;
  tax_rate?: number;
}

export interface CreateCommercialDocumentDto {
  document_type: CommercialDocumentType;
  client_id?: string;
  client_name: string;
  client_tax_id?: string;
  issue_date?: string;
  valid_until?: string;
  delivery_date?: string;
  payment_method?: string;
  exchange_rate?: number;
  carrier_name?: string;
  vehicle_plate?: string;
  driver_name?: string;
  notes?: string;
  items: CommercialDocumentItemDto[];
}
