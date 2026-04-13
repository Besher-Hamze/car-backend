import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole } from './user.schema';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');

    if (!email || !password) return;

    const existing = await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    if (existing) return;

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.userModel.create({
      email: email.toLowerCase(),
      password: hash,
      name: 'Admin',
      role: UserRole.ADMIN,
    });
    console.log(`✅ Seeded admin user: ${email}`);
  }

  async create(data: any): Promise<UserDocument> {
    const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return this.userModel.create({
      email: data.email.toLowerCase(),
      password: hash,
      name: data.name,
      role: data.role ?? UserRole.USER,
    });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
