import { IsOptional, IsString, IsNumber, Min, Max, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Código único de producto (SKU) a actualizar',
    example: 'PROD-001-NEW',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Nombre descriptivo del producto a actualizar',
    example: 'Harina de Trigo Leudante 1kg',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del producto a actualizar',
    example: 'Harina de trigo con polvo de hornear',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL de la imagen del producto',
    example: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({
    description: 'Costo unitario de adquisición en USD',
    example: 1.35,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_usd?: number;

  @ApiPropertyOptional({
    description: 'Precio de venta al público en USD',
    example: 2.70,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_usd?: number;

  @ApiPropertyOptional({
    description: 'Tasa de impuesto (porcentaje de 0 a 100)',
    example: 12.00,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate?: number;

  @ApiPropertyOptional({
    description: 'Unidad de medida a actualizar',
    example: 'kg',
  })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsString()
  unit_of_measure?: string;

  @ApiPropertyOptional({
    description: 'Categoría a actualizar (Nombre)',
    example: 'Alimentos',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'ID de Categoría a actualizar (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Variaciones del producto',
  })
  @IsOptional()
  @IsArray()
  variations?: any[];

  @ApiPropertyOptional({
    description: 'Campos avanzados estructurados',
  })
  @IsOptional()
  advancedFields?: any;

  @IsOptional()
  advanced_fields?: any;

  @ApiPropertyOptional({
    description: 'Tipo de impuesto a actualizar (TAXABLE, EXEMPT, EXONERATED)',
    example: 'TAXABLE',
  })
  @IsOptional()
  @IsString()
  taxType?: string;

  @IsOptional()
  @IsString()
  tax_type?: string;

  @ApiPropertyOptional({
     description: 'Indica si el producto es perecedero',
     example: false,
  })
  @IsOptional()
  isPerishable?: boolean;

  @IsOptional()
  is_perishable?: boolean;

  @ApiPropertyOptional({
     description: 'Indica si el producto tiene control de lotes',
     example: false,
  })
  @IsOptional()
  hasBatchControl?: boolean;

  @IsOptional()
  has_batch_control?: boolean;
}
