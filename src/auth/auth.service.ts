import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
    role?: 'user' | 'seller',
  ) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }
    /** Public registration cannot create admins; coerce to USER unless explicitly SELLER. */
    const finalRole = role === 'seller' ? UserRole.SELLER : UserRole.USER;
    const user = await this.usersService.create({
      email,
      password,
      name,
      role: finalRole,
    });
    return this.buildAuthResponse(user._id.toString(), user.email, user.role, user.name);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    const ok = await this.usersService.validatePassword(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    return this.buildAuthResponse(user._id.toString(), user.email, user.role, user.name);
  }

  private buildAuthResponse(userId: string, email: string, role: string, name: string) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: userId,
        email,
        role,
        name,
      },
    };
  }
}
