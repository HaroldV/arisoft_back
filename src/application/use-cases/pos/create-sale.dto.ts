import { IsNotEmpty, IsOptional, IsArray, ValidateNested, IsUUID, IsNumber, Min, IsString } from 'class-validator';
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

export class CreateSalePaymentDto {
  @ApiProperty({
    description: 'Método de pago de esta línea',
    example: 'CASH_USD',
  })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiProperty({
    description: 'Monto pagado en su moneda original',
    example: 10.00,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amountOriginal: number;

  @ApiProperty({
    description: 'Moneda utilizada',
    example: 'USD',
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Referencia bancaria si aplica (obligatorio para digitales)',
    example: '987654',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;
}

export class SaleChangeDto {
  @ApiProperty({
    description: 'Monto original del vuelto devuelto al cliente',
    example: 5.00,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amountOriginal: number;

  @ApiProperty({
    description: 'Moneda del vuelto devuelto al cliente',
    example: 'USD',
  })
  @IsNotEmpty()
  @IsString()
  currency: string;
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

  @ApiProperty({
    description: 'ID de cliente opcional asociado a la venta',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({
    description: 'Porcentaje de descuento aplicado a la venta',
    example: 10,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiProperty({
    description: 'Método de pago utilizado para la venta',
    example: 'CASH_USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Listado de pagos fraccionados para saldar la venta',
    type: [CreateSalePaymentDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments?: CreateSalePaymentDto[];

  @ApiProperty({
    description: 'Monto y moneda del vuelto entregado si aplica',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SaleChangeDto)
  change?: SaleChangeDto;
}

