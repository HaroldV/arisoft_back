import { BadRequestException, Injectable } from '@nestjs/common';
import { S3Service } from '../../../infrastructure/storage/s3-service';
import { validateUploadedFile } from './upload-file.dto';

export interface UploadImageResult {
  url: string;
  message: string;
}

const DEFAULT_FOLDER = 'general';
const ALLOWED_FOLDERS = ['logo', 'product-image', DEFAULT_FOLDER];

@Injectable()
export class UploadImageUseCase {
  constructor(private readonly s3Service: S3Service) {}

  async execute(file: Express.Multer.File, folder?: string): Promise<UploadImageResult> {
    try {
      validateUploadedFile(file);
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Archivo inválido');
    }

    const resolvedFolder = folder && ALLOWED_FOLDERS.includes(folder) ? folder : DEFAULT_FOLDER;

    const url = await this.s3Service.uploadFile(file, resolvedFolder);

    return {
      url,
      message: 'Archivo subido exitosamente',
    };
  }
}
