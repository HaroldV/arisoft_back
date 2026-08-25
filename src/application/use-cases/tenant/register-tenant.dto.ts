import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTenantDto {
  @ApiProperty({
    description: 'Correo electrónico de contacto y cuenta del propietario',
    example: 'juan@empresa.com',
  })
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @ApiProperty({
    description: 'Nombre comercial de la empresa/merchant',
    example: 'Comercial Ari, C.A.',
  })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'Nombre completo del propietario de la empresa',
    example: 'Juan Pérez',
  })
  @IsNotEmpty()
  @IsString()
  ownerName: string;

  @ApiProperty({
    description: 'Contraseña para la cuenta del propietario',
    example: 'SuperSecure123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'RIF de la empresa en formato venezolano (J-XXXXXXXX-X)',
    example: 'J-12345678-9',
  })
  @IsNotEmpty()
  @Matches(/^[JjVvGgEe]-?\d{8}-?\d$/, {
    message: 'RIF must follow the format J-12345678-9',
  })
  taxId: string;
}
