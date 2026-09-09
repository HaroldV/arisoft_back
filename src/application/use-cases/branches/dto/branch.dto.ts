import { IsNotEmpty, IsString, IsOptional, IsUUID, IsBoolean, Length } from 'class-validator';

export class CreateBranchDto {
  @IsNotEmpty({ message: 'El nombre de la sucursal es obligatorio' })
  @IsString()
  @Length(2, 150)
  name: string;

  @IsNotEmpty({ message: 'El código de la sucursal es obligatorio' })
  @IsString()
  @Length(2, 50)
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID del almacén debe ser un UUID válido' })
  defaultWarehouseId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID del almacén debe ser un UUID válido' })
  defaultWarehouseId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class AssignBranchWarehouseDto {
  @IsNotEmpty({ message: 'El ID del almacén es obligatorio' })
  @IsUUID('4', { message: 'El ID del almacén debe ser un UUID válido' })
  warehouseId: string;
}
