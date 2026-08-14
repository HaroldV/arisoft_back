import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../domain/entities/user.entity';
import { AppModule } from '../../../../infrastructure/auth/decorators/modules.decorator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre completo del nuevo usuario',
    example: 'Carlos Delgado',
  })
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @ApiProperty({
    description: 'Correo electrónico único de inicio de sesión',
    example: 'carlos@ari.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña para la cuenta del usuario',
    example: 'password123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'Rol del usuario dentro del sistema (predeterminado o personalizado)',
    example: 'CASHIER',
  })
  @IsNotEmpty()
  @IsString()
  role: string;

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
  })
  @IsArray()
  @IsEnum(AppModule, { each: true })
  allowed_modules: AppModule[];

  @ApiProperty({
    description: 'Lista de permisos granulares autorizados para el usuario',
    isArray: true,
    example: ['pos:create', 'clients:manage'],
  })
  @IsArray()
  @IsString({ each: true })
  allowed_permissions: string[];
}
