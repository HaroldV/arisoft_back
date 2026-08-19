import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

/**
 * S3Service
 *
 * Wraps the AWS SDK v3 S3 client configured against the Railway-provisioned
 * S3-compatible bucket (arisoft-uploads). Handles uploading and deleting
 * files, and builds the public URL used to reference the stored asset.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET') || '';
    this.region = this.configService.get<string>('S3_REGION') || 'auto';
    this.endpoint = this.configService.get<string>('S3_ENDPOINT') || '';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '';

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.endpoint || undefined,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Uploads a file buffer to the configured bucket under the given folder,
   * generating a unique key based on a timestamp + UUID to avoid collisions.
   *
   * @param file Multer file coming from a multipart/form-data request
   * @param folder Logical folder/prefix within the bucket (e.g. "logo", "product-image")
   * @returns The public URL of the uploaded file
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file) {
      throw new InternalServerErrorException('No se recibió ningún archivo para subir');
    }

    try {
      const sanitizedFolder = (folder || 'general').replace(/[^a-zA-Z0-9/_-]/g, '');
      const extension = this.getFileExtension(file.originalname, file.mimetype);
      const uniqueFileName = `${Date.now()}-${randomUUID()}${extension}`;
      const key = `${sanitizedFolder}/${uniqueFileName}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }),
      );

      return this.buildPublicUrl(key);
    } catch (error: any) {
      this.logger.error(`Error subiendo archivo a S3: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Error al subir el archivo al almacenamiento');
    }
  }

  /**
   * Deletes a file from the bucket given its key (path within the bucket).
   * Accepts either the raw key or a full public URL, from which the key
   * will be extracted.
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey) {
      return;
    }

    try {
      const key = this.extractKeyFromUrl(fileKey);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error: any) {
      this.logger.error(`Error eliminando archivo de S3: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Error al eliminar el archivo del almacenamiento');
    }
  }

  private buildPublicUrl(key: string): string {
    const base = this.endpoint ? this.endpoint.replace(/\/+$/, '') : '';
    if (!base) {
      return `${this.bucket}/${key}`;
    }
    return `${base}/${this.bucket}/${key}`;
  }

  private extractKeyFromUrl(fileKeyOrUrl: string): string {
    if (!fileKeyOrUrl.startsWith('http')) {
      return fileKeyOrUrl;
    }

    try {
      const url = new URL(fileKeyOrUrl);
      const path = url.pathname.replace(/^\/+/, '');
      const prefix = `${this.bucket}/`;
      return path.startsWith(prefix) ? path.slice(prefix.length) : path;
    } catch {
      return fileKeyOrUrl;
    }
  }

  private getFileExtension(originalName: string, mimetype: string): string {
    const fromName = originalName?.includes('.') ? `.${originalName.split('.').pop()}` : '';
    if (fromName) {
      return fromName.toLowerCase();
    }

    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    return mimeMap[mimetype] || '';
  }
}
