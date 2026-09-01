import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseItemDto {
  @ApiProperty({
    description: 'Identificador único (UUID) del producto a comprar',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Cantidad de unidades compradas',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Costo unitario de compra en USD',
    example: 12.50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  unitCostUsd: number;

  @ApiProperty({
    description: 'Identificador único (UUID) de la ubicación física en el WMS',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({
    description: 'Número de lote para productos con control de lotes',
    example: 'LT-2026-07',
    required: false,
  })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({
    description: 'Fecha de elaboración del lote (YYYY-MM-DD)',
    example: '2026-07-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  productionDate?: string;

  @ApiProperty({
    description: 'Fecha de vencimiento del lote para productos perecederos (YYYY-MM-DD)',
    example: '2027-07-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  expirationDate?: string;
}

export class RegisterPurchaseDto {
  @ApiProperty({
    description: 'Número identificador o de control de la factura del proveedor',
    example: 'FACT-2026-9901',
  })
  @IsNotEmpty()
  @IsString()
  invoiceNumber: string;

  @ApiProperty({
    description: 'Nombre comercial o RIF del proveedor de mercancía',
    example: 'Distribuidora Alimentos Polar C.A.',
  })
  @IsNotEmpty()
  @IsString()
  supplierName: string;

  @ApiProperty({
    description: 'Ruta o URL del comprobante físico de la factura de compra (PDF o imagen)',
    example: '/uploads/purchase-proofs/fact-2026-9901.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  proofFilePath?: string;

  @ApiProperty({
    description: 'Listado de artículos incluidos en la factura de compra',
    type: [PurchaseItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @ApiProperty({
    description: 'Identificador único (UUID) del proveedor',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiProperty({
    description: 'Porcentaje de descuento global aplicado a la factura (ej: 10 para 10%)',
    example: 10.00,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiProperty({
    description: 'RIF o Identificador Fiscal del proveedor',
    example: 'J-12345678-9',
    required: false,
  })
  @IsOptional()
  @IsString()
  supplierRif?: string;

  @ApiProperty({
    description: 'Condición de pago (ej: CONTADO, CREDITO_7, CREDITO_15, CREDITO_30, CREDITO_60)',
    example: 'CONTADO',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentTerm?: string;

  @ApiProperty({
    description: 'Moneda del documento (USD, VES)',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Tasa de cambio aplicada al momento de la factura',
    example: 52.40,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiProperty({
    description: 'Fecha de emisión de la factura (YYYY-MM-DD)',
    example: '2026-08-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  issueDate?: string;

  @ApiProperty({
    description: 'Fecha límite de pago para facturas a crédito (YYYY-MM-DD)',
    example: '2026-09-30',
    required: false,
  })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiProperty({
    description: 'Porcentaje de recargo o flete global aplicado a la factura (ej: 5 para 5%)',
    example: 5.00,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  globalSurchargePercentage?: number;

  @ApiProperty({
    description: 'Notas u observaciones de la compra',
    example: 'Factura con flete incluido',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Indica si la compra es a crédito (generará registro en Cuentas por Pagar)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isCredit?: boolean;

  @ApiProperty({
    description: 'Días de plazo de pago para la compra a crédito (ej: 15, 30, 45 días)',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  paymentTermsDays?: number;
}
