import { DataSource } from 'typeorm';
import { ALL_ENTITIES, User, Branch, Role, AccountPayment, AccountPayable, AccountReceivable } from '../../../../domain/entities';

describe('TypeORM Entity Metadata Integrity Gate (CI & Production Guard)', () => {
  it('should successfully build all TypeORM entity metadatas without unresolvable relations', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      entities: ALL_ENTITIES,
    });

    // buildMetadatas() verifies all @ManyToOne, @OneToMany, @JoinColumn mappings
    await expect((dataSource as any).buildMetadatas()).resolves.toBeUndefined();

    const userMetadata = dataSource.getMetadata(User);
    expect(userMetadata).toBeDefined();

    const branchRelation = userMetadata.findRelationWithPropertyPath('branch');
    expect(branchRelation).toBeDefined();
    expect(branchRelation?.inverseEntityMetadata.target).toBe(Branch);

    const roleRelation = userMetadata.findRelationWithPropertyPath('role_ref');
    expect(roleRelation).toBeDefined();
    expect(roleRelation?.inverseEntityMetadata.target).toBe(Role);

    const accountPaymentMetadata = dataSource.getMetadata(AccountPayment);
    expect(accountPaymentMetadata).toBeDefined();
    expect(accountPaymentMetadata.findRelationWithPropertyPath('payable_account')?.inverseEntityMetadata.target).toBe(AccountPayable);
    expect(accountPaymentMetadata.findRelationWithPropertyPath('receivable_account')?.inverseEntityMetadata.target).toBe(AccountReceivable);
  });
});
