import { IsNotEmpty, IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DisassembleBundleDto {
  @ApiProperty({ description: 'ID del almacén donde se realiza la operación', example: 'd3b07384-d113-4672-a722-e089d5334758' })
  @IsNotEmpty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'Número de bultos o combos a desarmar', example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bundlesToDisassemble: number;

  @ApiProperty({ description: 'Justificación o notas de auditoría', example: 'Desarmado para venta de unidades en POS', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
