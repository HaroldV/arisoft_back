import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({
    description: 'Saldo inicial en dólares en la caja',
    example: 100.00,
    required: false,
    default: 0.00,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalanceUsd?: number;

  @ApiProperty({
    description: 'Saldo inicial en bolívares en la caja',
    example: 500.00,
    required: false,
    default: 0.00,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalanceVes?: number;
}
