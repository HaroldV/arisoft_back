import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({
    description: 'Efectivo en dólares contado y declarado físicamente por el cajero',
    example: 120.00,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  declaredCashUsd: number;

  @ApiProperty({
    description: 'Efectivo en bolívares contado y declarado físicamente por el cajero',
    example: 600.00,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  declaredCashVes: number;
}
