import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { AuthService } from './auth.service';

export interface ChangeInitialPasswordDto {
  userId: string;
  currentPassword?: string;
  newPassword: string;
}

@Injectable()
export class ChangeInitialPasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(dto: ChangeInitialPasswordDto) {
    if (!dto.newPassword || dto.newPassword.length < 8) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres.');
    }

    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // Hash new password
    const newPasswordHash = await this.authService.hashPassword(dto.newPassword);
    user.password_hash = newPasswordHash;
    user.is_temporary_password = false;
    user.failed_login_attempts = 0;

    await this.userRepository.save(user);

    return {
      message: 'Contraseña actualizada exitosamente. Ya puedes acceder al sistema.',
      success: true,
    };
  }
}
