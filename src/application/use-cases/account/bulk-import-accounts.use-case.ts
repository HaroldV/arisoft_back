import { Injectable } from '@nestjs/common';
import { AccountReceivablePayableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-receivable-payable.repository';
import { CreateAccountUseCase } from './create-account.use-case';
import { BulkImportAccountsDto } from './dto/bulk-import-accounts.dto';
import { AccountReceivablePayable } from '../../../domain/entities/account-receivable-payable.entity';

@Injectable()
export class BulkImportAccountsUseCase {
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
  ) {}

  async execute(tenantId: string, dto: BulkImportAccountsDto): Promise<{
    imported: number;
    accounts: AccountReceivablePayable[];
  }> {
    const importedAccounts: AccountReceivablePayable[] = [];

    for (const item of dto.items) {
      item.type = dto.type;
      const account = await this.createAccountUseCase.execute(tenantId, item);
      importedAccounts.push(account);
    }

    return {
      imported: importedAccounts.length,
      accounts: importedAccounts,
    };
  }
}
