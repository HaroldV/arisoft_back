import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserRole } from '../../../domain/entities/user.entity';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(user: { id: string; role: string; tenant_id: string }): Promise<any[]> {
    if (user.role === UserRole.OWNER) {
      // Owner can see all users in the tenant
      return this.userRepository.findAllByTenant(user.tenant_id);
    } else if (user.role === UserRole.MANAGER) {
      // Manager can only see their team/subordinates recursively
      return this.userRepository.findSubordinatesRecursive(user.tenant_id, user.id);
    } else {
      throw new ForbiddenException('Only owners and managers can view user list');
    }
  }
}
