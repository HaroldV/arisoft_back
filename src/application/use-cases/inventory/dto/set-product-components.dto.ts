import { IsNotEmpty, IsUUID, IsNumber, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ComponentItemDto {
  @ApiProperty({ description: 'UUID del producto componente / hijo', example: 'd3b07384-d113-4672-a722-e089d5334758' })
  @IsNotEmpty()
  @IsUUID()
  childProductId: string;

  @ApiProperty({ description: 'Cantidad del producto hijo en el combo o bulto', example: 20 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiProperty({ description: 'Costo unitario referencial al momento de definir la receta', example: 1.25, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCostAtDefinition?: number;
}

export class SetProductComponentsDto {
  @ApiProperty({ description: 'Lista de componentes que conforman el producto compuesto', type: [ComponentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentItemDto)
  components: ComponentItemDto[];
}
