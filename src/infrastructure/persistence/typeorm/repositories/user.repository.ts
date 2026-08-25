import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from '../../../../domain/entities/user.entity';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = email ? email.trim() : '';
    return this.userRepository.findOne({
      where: [
        { email: ILike(cleanEmail) },
        { email: cleanEmail.toLowerCase() }
      ],
      select: [
        'id', 'tenant_id', 'full_name', 'email', 'password_hash', 
        'role', 'role_id', 'is_active', 'created_at', 'updated_at', 'creator_id', 'allowed_modules', 'allowed_permissions', 'failed_login_attempts', 'is_temporary_password'
      ],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async findAllByTenant(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'ASC' },
    });
  }

  async findSubordinatesRecursive(tenantId: string, userId: string): Promise<User[]> {
    return this.userRepository.query(
      `WITH RECURSIVE user_tree AS (
        SELECT id, tenant_id, full_name, email, role, creator_id, allowed_modules, is_active, created_at, updated_at
        FROM users 
        WHERE id = $1 AND tenant_id = $2
        
        UNION ALL
        
        SELECT u.id, u.tenant_id, u.full_name, u.email, u.role, u.creator_id, u.allowed_modules, u.is_active, u.created_at, u.updated_at
        FROM users u
        INNER JOIN user_tree ut ON u.creator_id = ut.id
        WHERE u.tenant_id = $2
      )
      SELECT * FROM user_tree WHERE id <> $1 ORDER BY created_at ASC`,
      [userId, tenantId]
    );
  }
}
