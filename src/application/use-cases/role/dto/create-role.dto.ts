import { IsNotEmpty, IsString, IsArray, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Nombre del rol personalizado',
    example: 'Supervisor de Tienda',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: 'Permisos asignados al rol',
    example: ['pos:create', 'pos:discount', 'inventory:view'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  allowed_permissions: string[];
}
