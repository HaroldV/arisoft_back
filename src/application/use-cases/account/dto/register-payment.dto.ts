import { IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../../../domain/entities/account-payment.entity';

export class RegisterPaymentDto {
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  exchange_rate?: number;

  @IsOptional()
  @IsString()
  reference_number?: string;
}
