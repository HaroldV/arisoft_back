import { Injectable, Logger, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { TenantStatusEnum } from '../../../domain/constants/domain.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      const errorMsg = 'FATAL ERROR: JWT_SECRET environment variable is not defined. System cannot start securely.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Validar en tiempo real que el usuario siga existiendo y permanezca activo
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: payload.sub }
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Tu cuenta se encuentra inactiva o desactivada. Por favor comunícate con el Administrador.');
    }

    let tenantStatus = TenantStatusEnum.ACTIVE;
    if (user.tenant_id) {
      const tenant = await this.dataSource.getRepository(Tenant).findOne({
        where: { id: user.tenant_id }
      });
      if (tenant) {
        tenantStatus = tenant.is_active ? TenantStatusEnum.ACTIVE : TenantStatusEnum.SUSPENDED;
      }
    }

    // Return payload to be injected into request.user
    return {
      userId: payload.sub,
      sub: payload.sub,
      email: payload.email,
      tenant_id: payload.tenant_id,
      tenant_status: tenantStatus,
      is_super_admin: payload.role === 'SUPER_ADMIN',
      role: payload.role,
      enabled_modules: payload.enabled_modules,
      permissions: payload.permissions || [],
    };
  }
}
