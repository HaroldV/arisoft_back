import { IsNotEmpty, MinLength, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EmployeeLoginDto {
  @ApiProperty({
    description: 'RIF de la empresa (Ej: J-12345678-0)',
    example: 'J-12345678-0',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  taxId: string;

  @ApiProperty({
    description: 'Nombre de usuario del empleado asignado por la empresa',
    example: 'cajero1',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  username: string;

  @ApiProperty({
    description: 'Contraseña de la cuenta del empleado',
    example: 'password123',
    minLength: 8,
  })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
