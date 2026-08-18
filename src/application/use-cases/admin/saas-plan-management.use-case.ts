import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SaasPlan } from '../../../domain/entities/saas-plan.entity';
import { SaasPlanEnum, PLAN_DEFAULT_MODULES, PLAN_DEFAULT_PERMISSIONS } from '../../../domain/constants/domain.constants';

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
          description: 'Para pequeños comercios y bodegones que inician digitalización en mostrador',
          monthly_fee_usd: 15.00,
          annual_fee_usd: 150.00,
          max_users: 2,
          max_products: 500,
          max_warehouses: 1,
          has_fiscal_printing: false,
          badge_text: 'Plan Inicial',
          is_featured: false,
          is_active: true,
          enabled_modules: PLAN_DEFAULT_MODULES[SaasPlanEnum.EMPRENDEDOR],
          enabled_permissions: PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.EMPRENDEDOR],
          features_list: [
            'Hasta 2 usuarios concurrentes',
            'Hasta 500 productos en catálogo',
            '1 Almacén / Bodega principal',
            'Punto de Venta (POS) & Facturación Directa',
            'Compras Básicas & Cuentas por Cobrar (CxC)',
            'Sincronización Tasa Oficial BCV ($ / €)'
          ]
        }),
        new SaasPlan({
          code: 'COMERCIAL_PRO',
          name: 'Comercial Pro',
          description: 'Para distribuidoras, farmacias y comercios medianos con preventa y compras',
          monthly_fee_usd: 35.00,
          annual_fee_usd: 350.00,
          max_users: 5,
          max_products: 3000,
          max_warehouses: 2,
          has_fiscal_printing: true,
          badge_text: 'Más Vendido',
          is_featured: true,
          is_active: true,
          enabled_modules: PLAN_DEFAULT_MODULES[SaasPlanEnum.COMERCIAL_PRO],
          enabled_permissions: PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.COMERCIAL_PRO],
          features_list: [
            'Hasta 5 usuarios concurrentes',
            'Hasta 3,000 productos en catálogo',
            'Hasta 2 Almacenes / Depósitos',
            'Cotizaciones, Notas de Pedido y Entrega',
            'Circuito formal de Órdenes de Compra y Recepción',
            'Cuentas por Cobrar (CxC), Pagar (CxP) y Bancos',
            'Actualización Masiva de Precios & Valuación',
            'Compatibilidad con Impresoras Fiscales'
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
          badge_text: 'Empresarial',
          is_featured: false,
          is_active: true,
          enabled_modules: PLAN_DEFAULT_MODULES[SaasPlanEnum.CORPORATIVO],
          enabled_permissions: PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.CORPORATIVO],
          features_list: [
            'Hasta 25 usuarios concurrentes',
            'Catálogo y Stock Ilimitado',
            'Multi-Almacén Ilimitado',
            'Módulo de Nómina & RRHH completo',
            'Reportes y Métricas BI Avanzadas',
            'Soporte Prioritario 24/7'
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
