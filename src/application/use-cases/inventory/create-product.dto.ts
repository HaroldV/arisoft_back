import { IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
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
}
