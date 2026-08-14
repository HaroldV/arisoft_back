import { BaseTenantRepository } from '../repositories/base-tenant.repository';

describe('TenantIsolation (Repository Data Security Tests)', () => {
  it('should throw an error if instantiated without a tenant_id', () => {
    expect(() => {
      new BaseTenantRepository<any>('');
    }).toThrow('Tenant ID is required to instantiate a repository. CRITICAL SECURITY FAULT.');
  });

  it('should forcefully inject tenant_id into find conditions', async () => {
    const tenantId = 'secure-tenant-123';
    const repo = new BaseTenantRepository<any>(tenantId);
    
    // Developer tries to find all records by mistake
    const conditions = { status: 'ACTIVE' }; 
    const secureConditions = repo['enforceTenantCondition'](conditions);

    expect(secureConditions.tenant_id).toBe(tenantId);
    expect(secureConditions.status).toBe('ACTIVE');
  });

  it('should override tenant_id if developer tries to query another tenant maliciously', async () => {
    const maliciousTenantId = 'hacked-tenant-999';
    const actualTenantId = 'my-real-tenant-123';
    const repo = new BaseTenantRepository<any>(actualTenantId);
    
    const conditions = { tenant_id: maliciousTenantId }; 
    const secureConditions = repo['enforceTenantCondition'](conditions);

    expect(secureConditions.tenant_id).toBe(actualTenantId); // Fails safe!
    expect(secureConditions.tenant_id).not.toBe(maliciousTenantId);
  });
});
