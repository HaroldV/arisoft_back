import { IsNotEmpty, IsOptional, IsArray, ValidateNested, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSaleItemDto {
  @ApiProperty({
    description: 'Identificador único (UUID) del producto a vender',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Cantidad de unidades vendidas',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @ApiProperty({
    description: 'Tasa de cambio aplicada en la venta (por ejemplo, Bs. por USD)',
    example: 36.50,
    default: 1.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRateApplied?: number;

  @ApiProperty({
    description: 'Justificación obligatoria si la venta provoca existencias en negativo',
    example: 'Venta autorizada por gerencia. Mercancía física disponible sin registrar factura de compra.',
    required: false,
  })
  @IsOptional()
  negativeStockJustification?: string;

  @ApiProperty({
    description: 'Listado de artículos incluidos en la venta',
    type: [CreateSaleItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
