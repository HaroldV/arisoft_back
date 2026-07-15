import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

import { FiscalDocType } from '../../../../domain/entities/tenant-fiscal-range.entity';

export class ConfigureFiscalRangeDto {
  @ApiProperty({ enum: Object.values(FiscalDocType), description: 'Tipo de documento fiscal' })
  @IsEnum(Object.values(FiscalDocType))
  type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

  @ApiProperty({ example: 1, description: 'Número inicial del rango' })
  @IsInt()
  @Min(1)
  startNumber: number;

  @ApiProperty({ example: 999999, description: 'Número final del rango' })
  @IsInt()
  @Min(1)
  endNumber: number;

  @ApiProperty({ example: 0, description: 'Número actual consumido del rango' })
  @IsInt()
  @Min(0)
  currentNumber: number;

  @ApiProperty({ example: 'SENIAT-2026-0001', description: 'Número de providencia o autorización del SENIAT' })
  @IsString()
  @IsNotEmpty()
  authorizationNumber: string;
}
