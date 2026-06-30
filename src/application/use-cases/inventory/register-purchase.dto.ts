import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsNumber, Min } from 'class-validator';
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
}
