import { IsOptional, IsString, IsNumber, Min, Max, IsArray, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
  @Transform(({ value, obj }) => value ?? obj.image_url)
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Costo unitario de adquisición en USD',
    example: 1.35,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value, obj }) => (value !== undefined ? Number(value) : (obj.cost_usd !== undefined ? Number(obj.cost_usd) : undefined)))
  costUsd?: number;

  @ApiPropertyOptional({
    description: 'Precio de venta al público en USD',
    example: 2.70,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value, obj }) => (value !== undefined ? Number(value) : (obj.price_usd !== undefined ? Number(obj.price_usd) : undefined)))
  priceUsd?: number;

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
  @Transform(({ value, obj }) => (value !== undefined ? Number(value) : (obj.tax_rate !== undefined ? Number(obj.tax_rate) : undefined)))
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Unidad de medida a actualizar',
    example: 'kg',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => value ?? obj.unit_of_measure)
  unitOfMeasure?: string;

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
  @Transform(({ value, obj }) => value ?? obj.category_id)
  categoryId?: string;

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
  @Transform(({ value, obj }) => value ?? obj.advanced_fields)
  advancedFields?: any;

  @ApiPropertyOptional({
    description: 'Tipo de impuesto a actualizar (TAXABLE, EXEMPT, EXONERATED)',
    example: 'TAXABLE',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => value ?? obj.tax_type)
  taxType?: string;

  @ApiPropertyOptional({
     description: 'Indica si el producto es perecedero',
     example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj }) => value ?? obj.is_perishable)
  isPerishable?: boolean;

  @ApiPropertyOptional({
     description: 'Indica si el producto tiene control de lotes',
     example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj }) => value ?? obj.has_batch_control)
  hasBatchControl?: boolean;
}
