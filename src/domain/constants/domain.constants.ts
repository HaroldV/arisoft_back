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
    SystemModuleEnum.INVENTORY_PURCHASES,
    SystemModuleEnum.INVENTORY,
    SystemModuleEnum.BANKS,
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
    // 1. Módulo Ventas (POS)
    'pos:create',
    'sales:invoicing',
    'clients:manage',
    // 2. Módulo Compras (INVENTORY_PURCHASES)
    'purchases:new',
    'purchases:invoices',
    'providers:manage',
    // 3. Módulo Control de Inventario (INVENTORY)
    'inventory:create',
    'inventory:stock',
    'inventory:warehouse',
    'inventory:categories',
    // 4. Módulo Cuentas (BANKS)
    'banks:accounts',
    // 5. Módulo Configuración de Empresa (SETTINGS)
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
  DEFAULT_SYSTEM_TENANT_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'sadmin@arivsoft.com',
  DEFAULT_PASSWORD_ONBOARDING: process.env.SUPERADMIN_PASSWORD || process.env.SAAS_DEFAULT_ONBOARDING_PASS || 'ArivPassword123!',
  DEFAULT_OWNER_NAME: 'Gerente General',
  PLAN_LIMITS: {
    EMPRENDEDOR: { USERS: 2, PRODUCTS: 500, FEE_USD: 25 },
    COMERCIAL_PRO: { USERS: 5, PRODUCTS: 5000, FEE_USD: 50 },
    CORPORATIVO: { USERS: 50, PRODUCTS: 999999, FEE_USD: 120 },
  },
  SAAS_ADDON_PRICING: {
    PAYROLL: 10.00,
    BANKS: 10.00,
    REPORTS: 8.00,
    SETTINGS: 5.00,
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
