import { IsNotEmpty, IsEnum, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { AccountType, EntityType } from '../../../../domain/entities/account-receivable-payable.entity';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsEnum(AccountType)
  type: AccountType;

  @IsNotEmpty()
  @IsEnum(EntityType)
  entity_type: EntityType;

  @IsOptional()
  @IsString()
  entity_id?: string;

  @IsNotEmpty()
  @IsString()
  entity_name: string;

  @IsOptional()
  @IsString()
  reference_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  previous_balance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  period_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cash_bs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  debit_bs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cash_usd?: number;
}
