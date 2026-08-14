import { IsNotEmpty, IsEnum, IsArray, ValidateNested, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../../../../domain/entities/account-receivable-payable.entity';
import { CreateAccountDto } from './create-account.dto';

export class BulkImportAccountsDto {
  @IsNotEmpty()
  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsBoolean()
  auto_create_entities?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAccountDto)
  items: CreateAccountDto[];
}
