import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  // Bootstrap only: refuses once any account exists. The first account
  // created this way is always 'admin', regardless of what's posted — every
  // subsequent account is created by an administrator via POST /users
  // (see UsersController), never by self-registration.
  async register(userData: { fullName: string; email: string; password: string }) {
    const existing = await this.usersService.count();
    if (existing > 0) {
      throw new ForbiddenException(
        'Sign-up is closed. Ask an administrator to create your account.',
      );
    }
    if (!userData?.email || !userData?.password || !userData?.fullName) {
      throw new ForbiddenException('Full name, email and password are required.');
    }

    const user = await this.usersService.create({
      fullName: userData.fullName,
      email: userData.email.toLowerCase(),
      password: userData.password,
      role: 'admin',
    });

    await this.auditService.record({
      actorId: user.id,
      actorName: user.fullName,
      action: 'bootstrap-admin',
      entityType: 'user',
      entityId: user.id,
    });

    return this.issueToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail((email || '').toLowerCase());

    // Same generic message either way — no email enumeration.
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(password || '', user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    await this.auditService.record({
      actorId: user.id,
      actorName: user.fullName,
      action: 'sign-in',
      entityType: 'user',
      entityId: user.id,
    });

    return this.issueToken(user);
  }

  private async issueToken(user: { id: number; email: string; role: string; fullName: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
