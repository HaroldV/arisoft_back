import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateCompanyProfileDto {
  @ApiProperty({ example: 'Ari Soft, C.A.', description: 'Razón social legal de la empresa' })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  company_name?: string;

  @ApiProperty({ example: 'J-12345678-9', description: 'Registro de Información Fiscal (RIF)' })
  @IsOptional()
  @IsString()
  @Matches(/^[JVRG]-[0-9]{8}-[0-9]$/, {
    message: 'El RIF debe tener un formato válido (Ej. J-12345678-9)',
  })
  tax_id?: string;

  @ApiProperty({ example: 'Ari Soft Store', description: 'Nombre comercial de la marca' })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  commercial_name?: string;

  @ApiProperty({ example: 'Av. Principal, Edificio Central, Piso 2, Caracas', description: 'Dirección fiscal de la empresa' })
  @IsOptional()
  @IsString()
  fiscal_address?: string;

  @ApiProperty({ example: '0212-1234567', description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'facturacion@arisoft.com', description: 'Correo electrónico fiscal' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: ['ORDINARY', 'SPECIAL', 'FORMAL'], example: 'ORDINARY', description: 'Tipo de contribuyente ante el SENIAT' })
  @IsOptional()
  @IsEnum(['ORDINARY', 'SPECIAL', 'FORMAL'])
  taxpayer_type?: 'ORDINARY' | 'SPECIAL' | 'FORMAL';

  @ApiProperty({ example: false, description: 'Indica si es agente de retención de IVA' })
  @IsOptional()
  @IsBoolean()
  is_withholding_agent?: boolean;

  @ApiProperty({ example: 'https://example.com/logo.png', description: 'URL del logotipo de la empresa' })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiProperty({ example: 'Gracias por su compra. RIF: J-12345678-9', description: 'Pie de página para los tickets' })
  @IsOptional()
  @IsString()
  receipt_footer?: string;

  @ApiProperty({ example: { baseCurrency: 'USD', isAutomatic: true, manualRate: 36.5, exchangeRate: 36.5 }, description: 'Configuraciones del tenant', required: false })
  @IsOptional()
  settings?: any;
}
