import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../../../domain/entities/system-setting.entity';

@Injectable()
export class SystemSettingRepository {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  async findByKey(key: string): Promise<SystemSetting | null> {
    return this.repo.findOne({ where: { key } });
  }

  async upsertSetting(key: string, value: any, description?: string): Promise<SystemSetting> {
    const setting = new SystemSetting({
      key,
      value,
      description,
      updated_at: new Date(),
    });
    return this.repo.save(setting);
  }
}
