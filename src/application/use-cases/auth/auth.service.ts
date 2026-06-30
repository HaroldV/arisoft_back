import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(private readonly jwtService: JwtService) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateAccessToken(user: User, enabledModules: string[] = []): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role,
      enabled_modules: enabledModules,
    };
    return this.jwtService.signAsync(payload);
  }

  async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      tenant_id: user.tenant_id,
    };
    return this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });
  }

  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token);
  }
}
