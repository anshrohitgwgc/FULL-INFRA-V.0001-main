import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Always hashes the incoming plain-text password — callers never hash it
  // themselves, so there's exactly one place this can go wrong.
  async create(userData: Partial<User> & { password: string }) {
    const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
    const user = this.usersRepository.create({
      ...userData,
      email: userData.email?.toLowerCase(),
      password: hashedPassword,
    });
    const saved = await this.usersRepository.save(user);
    // Never let the hash leave this service, even in a create response.
    const { password, ...safe } = saved;
    return safe as User;
  }

  async findAll() {
    return this.usersRepository.find({
      select: ['id', 'fullName', 'email', 'role', 'createdAt'],
    });
  }

  async count() {
    return this.usersRepository.count();
  }

  async findOne(id: number) {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'fullName', 'email', 'role', 'createdAt'],
    });
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
    });
  }
}
