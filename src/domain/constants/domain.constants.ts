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

export enum AccountStatusEnum {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum CashShiftStatusEnum {
  OPEN = 'OPEN',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  CLOSED = 'CLOSED',
  APPROVED = 'APPROVED',
}

export enum SaleStatusEnum {
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  DRAFT = 'DRAFT',
  ANULADA = 'ANULADA',
  AJUSTADA = 'AJUSTADA',
}

export enum FiscalNoteStatusEnum {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

export enum FiscalNoteTypeEnum {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum PurchaseOrderStatusEnum {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const FINANCIAL_CONSTANTS = {
  MIN_BALANCE_THRESHOLD: 0.01,
  ZERO_STRING_FALLBACK: '0',
};

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
    'pos:discount',
    'pos:refund',
    'sales:invoicing',
    'clients:manage',
    // 2. Módulo Compras (INVENTORY_PURCHASES)
    'purchases:new',
    'purchases:invoices',
    'providers:manage',
    // 3. Módulo Control de Inventario (INVENTORY)
    'inventory:create',
    'inventory:stock',
    'inventory:view',
    'inventory:write',
    'inventory:adjust',
    'inventory:warehouse',
    'inventory:categories',
    // 4. Módulo Cuentas (BANKS)
    'banks:accounts',
    'banks:ledger',
    // 5. Módulo Configuración de Empresa (SETTINGS)
    'company:manage',
    'fiscal:manage',
    'users:manage',
    'branches:manage',
  ],
  [SaasPlanEnum.COMERCIAL_PRO]: [
    'pos:create',
    'pos:discount',
    'pos:refund',
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
    'inventory:view',
    'inventory:write',
    'inventory:adjust',
    'inventory:bulk_prices',
    'inventory:valuation',
    'inventory:warehouse',
    'inventory:categories',
    'inventory:moves',
    'banks:accounts',
    'banks:ledger',
    'banks:shifts',
    'accounts:receivables',
    'accounts:payables',
    'accounts:history',
    'reports:view',
    'company:manage',
    'fiscal:manage',
    'users:manage',
    'branches:manage',
  ],
  [SaasPlanEnum.CORPORATIVO]: [
    'pos:create',
    'pos:discount',
    'pos:refund',
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
    'inventory:view',
    'inventory:write',
    'inventory:adjust',
    'inventory:bulk_prices',
    'inventory:valuation',
    'inventory:warehouse',
    'inventory:categories',
    'inventory:moves',
    'banks:accounts',
    'banks:ledger',
    'banks:shifts',
    'accounts:receivables',
    'accounts:payables',
    'accounts:history',
    'payroll:manage',
    'reports:view',
    'company:manage',
    'fiscal:manage',
    'users:manage',
    'branches:manage',
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
    EMPRENDEDOR: { USERS: 2, PRODUCTS: 500, BRANCHES: 1, FEE_USD: 25 },
    COMERCIAL_PRO: { USERS: 5, PRODUCTS: 5000, BRANCHES: 3, FEE_USD: 50 },
    CORPORATIVO: { USERS: 50, PRODUCTS: 999999, BRANCHES: 999, FEE_USD: 120 },
  },
  SAAS_ADDON_PRICING: {
    PAYROLL: 10.00,
    BANKS: 10.00,
    REPORTS: 8.00,
    SETTINGS: 5.00,
  },
  MESSAGES: {
    TENANT_CREATED: 'Empresa y usuario Propietario creados exitosamente',
    TENANT_UPDATED: 'Suscripción de la empresa actualizada exitosamente',
    OWNER_REACTIVATED: (email: string) => `Usuario propietario ${email} reactivado con éxito.`,
    INVALID_UUID: 'El identificador proporcionado debe ser un UUID válido.',
    TENANT_NOT_FOUND: 'Empresa no encontrada.',
    OWNER_NOT_FOUND: 'Usuario propietario no encontrado para esta empresa.',
    USER_NOT_FOUND: 'Usuario no encontrado.',
    INSUFFICIENT_STOCK: (productName: string, available: number, requested: number) =>
      `Stock insuficiente para el producto ${productName}. Disponible: ${available}, solicitado: ${requested}.`,
    INSUFFICIENT_PERMISSIONS: (required: string) =>
      `Permisos insuficientes. Se requiere: ${required}.`,
    INSUFFICIENT_PERMISSIONS_ANY: (required: string) =>
      `Permisos insuficientes. Se requiere al menos uno de: ${required}.`,
    FORBIDDEN_RESOURCE: 'No tienes los permisos necesarios para acceder a este recurso.',
    FORBIDDEN_MODULE: (modules: string) =>
      `Tu perfil de usuario no cuenta con acceso al módulo: ${modules}.`,
    FORBIDDEN_MODULE_ANY: (modules: string) =>
      `Tu perfil de usuario no cuenta con acceso a ninguno de los siguientes módulos: ${modules}.`,
    NO_SESSION_FOUND: 'No se encontró una sesión activa de usuario.',
    TENANT_MISMATCH: 'El identificador de la empresa no coincide con la sesión autenticada.',
    INVALID_CREDENTIALS: 'Credenciales inválidas.',
    REFRESH_TOKEN_REQUIRED: 'El token de actualización es requerido.',
    INVALID_REFRESH_TOKEN: 'Token de actualización inválido o expirado.',
    RESET_TOKEN_INVALID: 'El token de restablecimiento es inválido o ha expirado.',
    PRODUCT_NOT_FOUND: (id: string) => `Producto con ID ${id} no encontrado.`,
    PRODUCTS_NOT_FOUND: (ids: string) => `Productos no encontrados: ${ids}.`,
    PRODUCT_SKU_EXISTS: (sku: string) => `Ya existe un producto con el SKU ${sku}.`,
    COMPANY_RIF_EXISTS: (rif: string) => `Ya existe una empresa registrada con el RIF ${rif}.`,
    USER_EMAIL_EXISTS: (email: string) => `Ya existe un usuario registrado con el correo ${email}.`,
    ONLY_OWNERS_MANAGERS: 'Solo propietarios y gerentes tienen autorización para realizar esta acción.',
    MANAGERS_CANNOT_MANAGE_OWNERS: 'Los gerentes no pueden crear ni modificar usuarios con rol Propietario.',
    ROLE_NOT_FOUND: 'Rol no encontrado.',
    ROLE_IS_SYSTEM: 'No se pueden modificar ni eliminar los roles predeterminados del sistema.',
    ROLE_IN_USE: (count: number) =>
      `No se puede eliminar este rol porque actualmente está asignado a ${count} usuario(s). Reasigna a los usuarios antes de eliminarlo.`,
  },
};
