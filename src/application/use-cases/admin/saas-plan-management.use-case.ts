import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SaasPlan } from '../../../domain/entities/saas-plan.entity';

export interface CreateSaasPlanDto {
  name: string;
  code: string;
  description?: string;
  monthly_fee_usd?: number;
  annual_fee_usd?: number;
  max_users?: number;
  max_products?: number;
  max_warehouses?: number;
  has_fiscal_printing?: boolean;
  badge_text?: string;
  is_featured?: boolean;
  enabled_modules?: string[];
  enabled_permissions?: string[];
  features_list?: string[];
}

export interface UpdateSaasPlanDto {
  name?: string;
  description?: string;
  monthly_fee_usd?: number;
  annual_fee_usd?: number;
  max_users?: number;
  max_products?: number;
  max_warehouses?: number;
  has_fiscal_printing?: boolean;
  badge_text?: string;
  is_featured?: boolean;
  is_active?: boolean;
  enabled_modules?: string[];
  enabled_permissions?: string[];
  features_list?: string[];
}

@Injectable()
export class SaasPlanManagementUseCase {
  constructor(private readonly dataSource: DataSource) { }

  async listPlans(): Promise<SaasPlan[]> {
    const planRepo = this.dataSource.getRepository(SaasPlan);
    let plans = await planRepo.find({ order: { monthly_fee_usd: 'ASC' } });

    if (plans.length === 0) {
      const defaultPlans = [
        new SaasPlan({
          code: 'EMPRENDEDOR',
          name: 'Emprendedor',
          description: 'Para pequeños negocios y bodegones que inician digitalización',
          monthly_fee_usd: 15.00,
          annual_fee_usd: 150.00,
          max_users: 3,
          max_products: 500,
          max_warehouses: 1,
          has_fiscal_printing: false,
          badge_text: 'Plan Inicial',
          is_featured: false,
          is_active: true,
          enabled_modules: ['POS', 'INVENTORY'],
          enabled_permissions: ['pos:create', 'sales:invoicing', 'inventory:stock', 'inventory:create'],
          features_list: [
            'Hasta 3 usuarios concurrentes',
            'Hasta 500 productos en catálogo',
            '1 Almacén / Bodega principal',
            'Punto de Venta (POS) & Ventas',
            'Sincronización Tasa Oficial BCV'
          ]
        }),
        new SaasPlan({
          code: 'COMERCIAL_PRO',
          name: 'Comercial Pro',
          description: 'Para distribuidoras, farmacias y comercios medianos en expansión',
          monthly_fee_usd: 35.00,
          annual_fee_usd: 350.00,
          max_users: 10,
          max_products: 2500,
          max_warehouses: 3,
          has_fiscal_printing: true,
          badge_text: 'Más Vendido',
          is_featured: true,
          is_active: true,
          enabled_modules: ['POS', 'INVENTORY', 'BANKS', 'REPORTS', 'SETTINGS'],
          enabled_permissions: [
            'pos:create', 'sales:invoicing', 'sales:quotations', 'sales:orders', 'sales:deliveries', 'clients:manage', 'pos:shifts',
            'purchases:orders', 'purchases:receptions', 'purchases:new', 'purchases:invoices', 'providers:manage',
            'inventory:create', 'inventory:stock', 'inventory:bulk_prices', 'inventory:valuation', 'inventory:warehouse', 'inventory:categories', 'inventory:moves',
            'banks:accounts', 'accounts:receivables', 'accounts:payables', 'accounts:history',
            'reports:view',
            'company:manage', 'fiscal:manage', 'users:manage'
          ],
          features_list: [
            'Hasta 10 usuarios concurrentes',
            'Hasta 2,500 productos en catálogo',
            'Hasta 3 Almacenes / Depósitos',
            'Compatibilidad con Impresoras Fiscales',
            'Cuentas por Cobrar (CxC) y Pagar (CxP)',
            'Reportes y Métricas BI Avanzadas'
          ]
        }),
        new SaasPlan({
          code: 'CORPORATIVO',
          name: 'Corporativo',
          description: 'Para cadenas de tiendas, mayoristas y grandes empresas',
          monthly_fee_usd: 60.00,
          annual_fee_usd: 600.00,
          max_users: 25,
          max_products: 10000,
          max_warehouses: 10,
          has_fiscal_printing: true,
          badge_text: 'Full Equip',
          is_featured: false,
          is_active: true,
          enabled_modules: ['POS', 'INVENTORY', 'BANKS', 'REPORTS', 'PAYROLL', 'SETTINGS'],
          enabled_permissions: [
            'pos:create', 'sales:invoicing', 'sales:quotations', 'sales:orders', 'sales:deliveries', 'clients:manage', 'pos:shifts',
            'purchases:orders', 'purchases:receptions', 'purchases:new', 'purchases:invoices', 'providers:manage',
            'inventory:create', 'inventory:stock', 'inventory:bulk_prices', 'inventory:valuation', 'inventory:warehouse', 'inventory:categories', 'inventory:moves',
            'banks:accounts', 'accounts:receivables', 'accounts:payables', 'accounts:history',
            'reports:view',
            'company:manage', 'fiscal:manage', 'users:manage'
          ],
          features_list: [
            'Hasta 25 usuarios u operadores',
            'Hasta 10,000 productos en catálogo',
            'Almacenes y Sucursales ilimitadas',
            'Soporte Fiscal & IGTF estricto',
            'Módulo de Nómina & RRHH',
            'Integraciones API & Cashea'
          ]
        })
      ];
      plans = await planRepo.save(defaultPlans);
    }

    return plans;
  }

  async createPlan(dto: CreateSaasPlanDto): Promise<{ message: string; plan: SaasPlan }> {
    const planRepo = this.dataSource.getRepository(SaasPlan);
    const { name, code, description, monthly_fee_usd, annual_fee_usd, max_users, max_products, max_warehouses, has_fiscal_printing, badge_text, is_featured, enabled_modules, enabled_permissions, features_list } = dto;

    if (!name || !code) {
      throw new BadRequestException('Nombre y código único son requeridos');
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_');
    const existing = await planRepo.findOne({ where: { code: cleanCode } });
    if (existing) {
      throw new ConflictException(`Ya existe un plan registrado con el código ${cleanCode}`);
    }

    const plan = new SaasPlan({
      code: cleanCode,
      name,
      description: description || '',
      monthly_fee_usd: Number(monthly_fee_usd || 0),
      annual_fee_usd: Number(annual_fee_usd || (monthly_fee_usd ? monthly_fee_usd * 10 : 0)),
      max_users: Number(max_users || 5),
      max_products: Number(max_products || 1000),
      max_warehouses: Number(max_warehouses || 1),
      has_fiscal_printing: Boolean(has_fiscal_printing),
      badge_text: badge_text || '',
      is_featured: Boolean(is_featured),
      is_active: true,
      enabled_modules: enabled_modules || ['POS', 'INVENTORY'],
      enabled_permissions: enabled_permissions || [],
      features_list: features_list || []
    });

    const savedPlan = await planRepo.save(plan);
    return { message: 'Plan SaaS registrado exitosamente', plan: savedPlan };
  }

  async updatePlan(id: string, dto: UpdateSaasPlanDto): Promise<{ message: string; plan: SaasPlan }> {
    const planRepo = this.dataSource.getRepository(SaasPlan);
    const plan = await planRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    const { name, description, monthly_fee_usd, annual_fee_usd, max_users, max_products, max_warehouses, has_fiscal_printing, badge_text, is_featured, is_active, enabled_modules, enabled_permissions, features_list } = dto;

    plan.name = name || plan.name;
    plan.description = description !== undefined ? description : plan.description;
    plan.monthly_fee_usd = monthly_fee_usd !== undefined ? Number(monthly_fee_usd) : plan.monthly_fee_usd;
    plan.annual_fee_usd = annual_fee_usd !== undefined ? Number(annual_fee_usd) : plan.annual_fee_usd;
    plan.max_users = max_users !== undefined ? Number(max_users) : plan.max_users;
    plan.max_products = max_products !== undefined ? Number(max_products) : plan.max_products;
    plan.max_warehouses = max_warehouses !== undefined ? Number(max_warehouses) : plan.max_warehouses;
    plan.has_fiscal_printing = has_fiscal_printing !== undefined ? Boolean(has_fiscal_printing) : plan.has_fiscal_printing;
    plan.badge_text = badge_text !== undefined ? badge_text : plan.badge_text;
    plan.is_featured = is_featured !== undefined ? Boolean(is_featured) : plan.is_featured;
    plan.is_active = is_active !== undefined ? Boolean(is_active) : plan.is_active;
    plan.enabled_modules = enabled_modules || plan.enabled_modules;
    plan.enabled_permissions = enabled_permissions || plan.enabled_permissions;
    plan.features_list = features_list || plan.features_list;

    const updatedPlan = await planRepo.save(plan);
    return { message: 'Plan SaaS actualizado exitosamente', plan: updatedPlan };
  }

  async togglePlanStatus(id: string, isActive?: boolean): Promise<{ message: string; plan: SaasPlan }> {
    const planRepo = this.dataSource.getRepository(SaasPlan);
    const plan = await planRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    plan.is_active = isActive !== undefined ? Boolean(isActive) : !plan.is_active;
    const updatedPlan = await planRepo.save(plan);
    return { message: `Plan ${updatedPlan.is_active ? 'activado' : 'desactivado'} exitosamente`, plan: updatedPlan };
  }
}
