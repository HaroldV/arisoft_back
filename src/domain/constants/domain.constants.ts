/**
 * Centralized Domain Enums & Constants for Backend Business Rules
 */

export enum TenantStatusEnum {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum RifTypeEnum {
  JURIDICO = 'JURIDICO',
  NATURAL_V = 'NATURAL_V',
  NATURAL_E = 'NATURAL_E',
  GUBERNAMENTAL = 'GUBERNAMENTAL',
  PASAPORTE = 'PASAPORTE',
}

export enum SaasPlanEnum {
  EMPRENDEDOR = 'EMPRENDEDOR',
  COMERCIAL_PRO = 'COMERCIAL_PRO',
  CORPORATIVO = 'CORPORATIVO',
}

export enum SystemModuleEnum {
  POS = 'POS',
  SALES = 'SALES',
  INVENTORY_PURCHASES = 'INVENTORY_PURCHASES',
  INVENTORY = 'INVENTORY',
  BANKS = 'BANKS',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
  PAYROLL = 'PAYROLL',
}

export const PLAN_DEFAULT_MODULES: Record<SaasPlanEnum, SystemModuleEnum[]> = {
  [SaasPlanEnum.EMPRENDEDOR]: [
    SystemModuleEnum.POS,
    SystemModuleEnum.SALES,
    SystemModuleEnum.INVENTORY,
    SystemModuleEnum.REPORTS,
    SystemModuleEnum.SETTINGS,
  ],
  [SaasPlanEnum.COMERCIAL_PRO]: [
    SystemModuleEnum.POS,
    SystemModuleEnum.SALES,
    SystemModuleEnum.INVENTORY,
    SystemModuleEnum.INVENTORY_PURCHASES,
    SystemModuleEnum.BANKS,
    SystemModuleEnum.REPORTS,
    SystemModuleEnum.SETTINGS,
  ],
  [SaasPlanEnum.CORPORATIVO]: [
    SystemModuleEnum.POS,
    SystemModuleEnum.SALES,
    SystemModuleEnum.INVENTORY,
    SystemModuleEnum.INVENTORY_PURCHASES,
    SystemModuleEnum.BANKS,
    SystemModuleEnum.REPORTS,
    SystemModuleEnum.SETTINGS,
    SystemModuleEnum.PAYROLL,
  ],
};

export const PLAN_DEFAULT_PERMISSIONS: Record<SaasPlanEnum, string[]> = {
  [SaasPlanEnum.EMPRENDEDOR]: [
    'pos:create',
    'sales:invoicing',
    'clients:manage',
    'purchases:new',
    'purchases:invoices',
    'providers:manage',
    'inventory:create',
    'inventory:stock',
    'inventory:categories',
    'inventory:moves',
    'accounts:receivables',
    'reports:view',
    'company:manage',
    'fiscal:manage',
    'users:manage'
  ],
  [SaasPlanEnum.COMERCIAL_PRO]: [
    'pos:create',
    'sales:invoicing',
    'sales:quotations',
    'sales:orders',
    'sales:deliveries',
    'clients:manage',
    'pos:shifts',
    'purchases:orders',
    'purchases:receptions',
    'purchases:new',
    'purchases:invoices',
    'providers:manage',
    'inventory:create',
    'inventory:stock',
    'inventory:bulk_prices',
    'inventory:valuation',
    'inventory:warehouse',
    'inventory:categories',
    'inventory:moves',
    'banks:accounts',
    'accounts:receivables',
    'accounts:payables',
    'accounts:history',
    'reports:view',
    'company:manage',
    'fiscal:manage',
    'users:manage'
  ],
  [SaasPlanEnum.CORPORATIVO]: [
    'pos:create',
    'sales:invoicing',
    'sales:quotations',
    'sales:orders',
    'sales:deliveries',
    'clients:manage',
    'pos:shifts',
    'purchases:orders',
    'purchases:receptions',
    'purchases:new',
    'purchases:invoices',
    'providers:manage',
    'inventory:create',
    'inventory:stock',
    'inventory:bulk_prices',
    'inventory:valuation',
    'inventory:warehouse',
    'inventory:categories',
    'inventory:moves',
    'banks:accounts',
    'accounts:receivables',
    'accounts:payables',
    'accounts:history',
    'payroll:manage',
    'reports:view',
    'company:manage',
    'fiscal:manage',
    'users:manage'
  ],
};

export const BACKEND_SYSTEM_CONSTANTS = {
  TRIAL_DAYS_STANDARD: 90,
  ANNUAL_DAYS_STANDARD: 365,
  SUBSCRIPTION_RENEWAL_DAYS: 30,
  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'sadmin@arivsoft.com',
  DEFAULT_PASSWORD_ONBOARDING: process.env.SUPERADMIN_PASSWORD || process.env.SAAS_DEFAULT_ONBOARDING_PASS || 'ArivPassword123!',
  DEFAULT_OWNER_NAME: 'Gerente General',
  PLAN_LIMITS: {
    EMPRENDEDOR: { USERS: 2, PRODUCTS: 500, FEE_USD: 15 },
    COMERCIAL_PRO: { USERS: 5, PRODUCTS: 3000, FEE_USD: 35 },
    CORPORATIVO: { USERS: 25, PRODUCTS: 10000, FEE_USD: 60 },
  },
  MESSAGES: {
    TENANT_CREATED: 'Tenant and Owner user created successfully',
    TENANT_UPDATED: 'Tenant subscription updated successfully',
    OWNER_REACTIVATED: (email: string) => `Usuario propietario ${email} reactivado con éxito.`,
    INVALID_UUID: 'Invalid tenant ID format',
    TENANT_NOT_FOUND: 'Tenant not found',
    OWNER_NOT_FOUND: 'Owner user not found for this tenant',
  },
};
