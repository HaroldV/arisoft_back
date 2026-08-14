import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommercialDocument, CommercialDocumentType } from '../../../../domain/entities/commercial-document.entity';

@Injectable()
export class CommercialDocumentRepository {
  constructor(
    @InjectRepository(CommercialDocument)
    private readonly repository: Repository<CommercialDocument>,
  ) {}

  async save(document: CommercialDocument): Promise<CommercialDocument> {
    return this.repository.save(document);
  }

  async findById(id: string): Promise<CommercialDocument | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  async findByType(
    tenantId: string,
    type: CommercialDocumentType,
    search?: string,
  ): Promise<CommercialDocument[]> {
    const qb = this.repository.createQueryBuilder('d')
      .leftJoinAndSelect('d.items', 'items')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.document_type = :type', { type });

    if (search) {
      qb.andWhere(
        '(LOWER(d.document_number) LIKE :search OR LOWER(d.client_name) LIKE :search OR LOWER(d.client_tax_id) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    qb.orderBy('d.created_at', 'DESC');

    return qb.getMany();
  }

  async generateNextNumber(tenantId: string, type: CommercialDocumentType): Promise<string> {
    const prefix = type === CommercialDocumentType.QUOTATION ? 'COT'
                 : type === CommercialDocumentType.SALES_ORDER ? 'PED'
                 : 'NDE';
    
    const count = await this.repository.count({
      where: { tenant_id: tenantId, document_type: type },
    });

    const year = new Date().getFullYear();
    const nextSeq = (count + 1).toString().padStart(4, '0');

    return `${prefix}-${year}-${nextSeq}`;
  }
}
