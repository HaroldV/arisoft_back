import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { UploadImageUseCase } from '../../../application/use-cases/file/upload-image.use-case';
import { UploadFileDto } from '../../../application/use-cases/file/upload-file.dto';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileUploadController {
  constructor(private readonly uploadImageUseCase: UploadImageUseCase) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Subir una imagen (logo o producto) al almacenamiento S3',
    description:
      'Recibe un archivo multipart/form-data (campo "file") y una carpeta lógica (campo "folder": logo | product-image). ' +
      'Devuelve la URL pública del archivo para ser almacenada en la base de datos (ej. Tenant.logo_url o Product.image_url).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo de imagen y carpeta destino',
    type: UploadFileDto,
  })
  @ApiOkResponse({
    description: 'Archivo subido exitosamente',
    schema: {
      example: {
        url: 'https://arisoft-uploads.s3.railway-storage.com/logo/1719859200000-3f2a1c4e-...-webp',
        message: 'Archivo subido exitosamente',
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo en el campo "file"');
    }

    return this.uploadImageUseCase.execute(file, folder);
  }
}
