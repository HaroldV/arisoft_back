import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class TransferStockDto {
  @IsNotEmpty()
  productId: string;

  @IsNotEmpty()
  fromLocationId: string;

  @IsNotEmpty()
  toLocationId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
