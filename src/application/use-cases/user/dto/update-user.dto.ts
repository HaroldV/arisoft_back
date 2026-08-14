import { IsEmail, IsString, MinLength, IsEnum, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../domain/entities/user.entity';
import { AppModule } from '../../../../infrastructure/auth/decorators/modules.decorator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Carlos Delgado',
    required: false,
  })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({
    description: 'Correo electrónico único de inicio de sesión',
    example: 'carlos@ari.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Contraseña para la cuenta del usuario',
    example: 'newpassword123',
    minLength: 8,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string;

  @ApiProperty({
    description: 'Rol del usuario dentro del sistema (predeterminado o personalizado)',
    example: 'CASHIER',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    description: 'ID de rol personalizado de base de datos',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    required: false,
  })
  @IsOptional()
  @IsString()
  role_id?: string;

  @ApiProperty({
    description: 'Lista de módulos autorizados para el usuario',
    enum: AppModule,
    isArray: true,
    example: [AppModule.POS],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AppModule, { each: true })
  allowed_modules?: AppModule[];

  @ApiProperty({
    description: 'Indica si el usuario está activo en el sistema',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Lista de permisos granulares autorizados para el usuario',
    isArray: true,
    example: ['pos:create', 'clients:manage'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_permissions?: string[];

  @ApiProperty({
    description: 'ID del nuevo supervisor al cual transferir los subordinados si se desactiva',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
    required: false,
  })
  @IsOptional()
  @IsString()
  transfer_subordinates_to_id?: string;
}
