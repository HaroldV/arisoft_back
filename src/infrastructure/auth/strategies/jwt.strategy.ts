import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
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
    // Return payload to be injected into request.user
    return {
      userId: payload.sub,
      email: payload.email,
      tenant_id: payload.tenant_id,
      role: payload.role,
      enabled_modules: payload.enabled_modules,
    };
  }
}
