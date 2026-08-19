import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo de imagen a subir (jpeg, png o webp, máximo 5MB)',
  })
  file: any;

  @ApiProperty({
    description: 'Carpeta lógica donde se almacenará el archivo dentro del bucket',
    example: 'logo',
    enum: ['logo', 'product-image'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['logo', 'product-image'])
  folder?: string;
}

/**
 * Validates a Multer file against the allowed MIME types and max size.
 * Throws a plain Error with a descriptive message; the controller/use-case
 * is responsible for translating it into the appropriate HTTP exception.
 */
export function validateUploadedFile(file: Express.Multer.File): void {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo');
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(
      `Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
    );
  }
}
