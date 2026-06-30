import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
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
    description: 'Costo unitario de adquisición en USD',
    example: 1.35,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costUsd?: number;

  @ApiPropertyOptional({
    description: 'Precio de venta al público en USD',
    example: 2.70,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
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
  taxRate?: number;
}
