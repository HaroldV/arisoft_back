import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBankAccountDto, BankAccountsController } from './bank-accounts.controller';
import { BankAccountRepository } from '../../../infrastructure/persistence/typeorm/repositories/bank-account.repository';
import { DataSource } from 'typeorm';

describe('BankAccountsController and CreateBankAccountDto', () => {
  describe('CreateBankAccountDto validation and transformation', () => {
    it('should automatically set bank_name to "Caja de Efectivo" when account_type is EFECTIVO and bank_name is missing or empty', async () => {
      const plain = {
        name: 'Caja Principal USD',
        account_type: 'EFECTIVO',
        currency: 'USD',
        bank_name: '',
      };

      const dto = plainToInstance(CreateBankAccountDto, plain);
      const errors = await validate(dto);

      expect(dto.bank_name).toBe('Caja de Efectivo');
      expect(errors.length).toBe(0);
    });

    it('should automatically set bank_name to "Zelle" when account_type is ZELLE and bank_name is empty', async () => {
      const plain = {
        name: 'Cuenta Zelle Empresa',
        account_type: 'ZELLE',
        currency: 'USD',
        bank_name: '',
      };

      const dto = plainToInstance(CreateBankAccountDto, plain);
      const errors = await validate(dto);

      expect(dto.bank_name).toBe('Zelle');
      expect(errors.length).toBe(0);
    });

    it('should keep custom bank_name if provided and not empty', async () => {
      const plain = {
        name: 'Banco Banesco VES',
        account_type: 'CORRIENTE',
        currency: 'VES',
        bank_name: 'Banesco Banco Universal',
      };

      const dto = plainToInstance(CreateBankAccountDto, plain);
      const errors = await validate(dto);

      expect(dto.bank_name).toBe('Banesco Banco Universal');
      expect(errors.length).toBe(0);
    });

    it('should fail validation if account_type is CORRIENTE and bank_name is empty', async () => {
      const plain = {
        name: 'Banco Sin Nombre',
        account_type: 'CORRIENTE',
        currency: 'VES',
        bank_name: '',
      };

      const dto = plainToInstance(CreateBankAccountDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const bankNameError = errors.find((e) => e.property === 'bank_name');
      expect(bankNameError).toBeDefined();
    });
  });

  describe('BankAccountsController.create fallback', () => {
    let controller: BankAccountsController;
    let mockRepo: jest.Mocked<BankAccountRepository>;
    let mockDataSource: jest.Mocked<DataSource>;

    beforeEach(() => {
      mockRepo = {
        save: jest.fn().mockImplementation((account) => Promise.resolve(account)),
      } as any;
      mockDataSource = {} as any;
      controller = new BankAccountsController(mockRepo, mockDataSource);
    });

    it('should save account with bank_name fallback if EFECTIVO account has empty bank_name', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const req = { user: { tenant_id: tenantId } };

      const dto: CreateBankAccountDto = {
        name: 'Caja Chica',
        account_type: 'EFECTIVO',
        currency: 'USD',
        bank_name: '',
      };

      const saved = await controller.create(tenantId, dto, req);

      expect(saved.bank_name).toBe('Caja de Efectivo');
      expect(saved.name).toBe('Caja Chica');
      expect(saved.currency).toBe('USD');
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });
});
