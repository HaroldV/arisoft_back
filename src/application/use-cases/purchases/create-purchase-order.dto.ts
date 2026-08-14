import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsOptional()
  @IsNumber()
  itemNumber?: number;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsNumber()
  @Min(0.0001)
  quantityOrdered!: number;

  @IsNumber()
  @Min(0)
  unitCostUsd!: number;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  taxType?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  additionalTaxAmount?: number;

  @IsOptional()
  @IsString()
  lineComment?: string;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @IsOptional()
  @IsString()
  supplierRif?: string;

  @IsOptional()
  @IsString()
  paymentTerm?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsBoolean()
  isNational?: boolean;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  globalDiscountPercentage?: number;

  @IsOptional()
  @IsNumber()
  globalDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  globalSurchargePercentage?: number;

  @IsOptional()
  @IsNumber()
  globalSurchargeAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}
