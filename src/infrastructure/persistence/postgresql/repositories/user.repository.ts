import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../../domain/entities/user.entity';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, is_active: true },
      select: [
        'id', 'tenant_id', 'full_name', 'email', 'password_hash', 
        'role', 'is_active', 'created_at', 'updated_at'
      ],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id, is_active: true } });
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }
}
