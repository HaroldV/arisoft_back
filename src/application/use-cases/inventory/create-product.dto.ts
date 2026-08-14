import { IsNotEmpty, IsNumber, IsOptional, Min, Max, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Código único de producto (SKU)',
    example: 'PROD-001',
  })
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Nombre descriptivo del producto',
    example: 'Harina de Trigo 1kg',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Descripción opcional detallada del producto',
    example: 'Harina de trigo todo uso refinada',
    required: false,
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL de la imagen del producto',
    example: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({
    description: 'Costo unitario de adquisición en USD',
    example: 1.25,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  costUsd: number;

  @ApiProperty({
    description: 'Precio de venta al público en USD',
    example: 2.50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  priceUsd: number;

  @ApiProperty({
    description: 'Tasa de impuesto (porcentaje de 0 a 100)',
    example: 16.00,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate: number;

  @ApiProperty({
    description: 'Cantidad de stock inicial para registrar',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  initialStock: number;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'unidades',
    required: false,
  })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiProperty({
    description: 'Categoría del producto (Nombre)',
    example: 'General',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'ID de la Categoría del producto (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'Variaciones del producto',
    required: false,
  })
  @IsOptional()
  @IsArray()
  variations?: any[];

  @ApiProperty({
    description: 'Campos avanzados estructurados',
    required: false,
  })
  @IsOptional()
  advancedFields?: any;

  @ApiProperty({
    description: 'Tipo de impuesto (TAXABLE, EXEMPT, EXONERATED)',
    example: 'TAXABLE',
    required: false,
  })
  @IsOptional()
  @IsString()
  taxType?: string;

  @ApiProperty({
    description: 'Indica si el producto es perecedero',
    example: false,
    required: false,
  })
  @IsOptional()
  isPerishable?: boolean;

  @ApiProperty({
    description: 'Indica si el producto tiene control de lotes',
    example: false,
    required: false,
  })
  @IsOptional()
  hasBatchControl?: boolean;

  @ApiProperty({
    description: 'Número de lote para el stock inicial',
    example: 'LOTE-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({
    description: 'Fecha de producción del lote inicial (YYYY-MM-DD)',
    example: '2026-07-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  productionDate?: string;

  @ApiProperty({
    description: 'Fecha de vencimiento del lote inicial (YYYY-MM-DD)',
    example: '2026-12-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  expirationDate?: string;

  @ApiProperty({
    description: 'ID de ubicación de almacén (warehouse_location) para inicializar stock',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;
}
