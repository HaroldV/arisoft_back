import { User } from '../entities/user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  findAllByTenant(tenantId: string): Promise<User[]>;
  findSubordinatesRecursive(tenantId: string, userId: string): Promise<User[]>;
}
