import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { PoolClient } from 'pg';

type JwtPayload = {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  jti: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
    private readonly redis: RedisService
  ) {}

  async login(dto: LoginDto, tenantId?: string) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant missing');
    }

    const user = await this.findOrCreateUser(dto.email.toLowerCase(), dto.password, tenantId, dto.role);
    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      tenantId,
      role: user.role,
      email: user.email,
      jti
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d'
    });

    await this.storeRefreshToken(user.id, jti, refreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer'
    };
  }

  async verify(token: string) {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  private async findOrCreateUser(email: string, password: string, tenantId: string, role?: string) {
    const client = await this.db.getClient();
    try {
      await this.ensureTenantExists(client, tenantId);
      const existing = await client.query(
        'SELECT id, email, role, password_hash FROM users WHERE email = $1 AND tenant_id = $2 LIMIT 1',
        [email, tenantId]
      );
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }
      const password_hash = await bcrypt.hash(password, 10);
      const userRole = role || 'owner';
      const insert = await client.query(
        'INSERT INTO users (id, tenant_id, email, password_hash, role, status, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now(), now()) RETURNING id, email, role, password_hash',
        [tenantId, email, password_hash, userRole, 'active']
      );
      return insert.rows[0];
    } finally {
      client.release();
    }
  }

  private async ensureTenantExists(client: PoolClient, tenantId: string) {
    await client.query(
      'INSERT INTO tenants (id, name, plan, status, created_at, updated_at) VALUES ($1, $2, $3, $4, now(), now()) ON CONFLICT (id) DO NOTHING',
      [tenantId, 'Default Tenant', 'starter', 'active']
    );
  }

  private async storeRefreshToken(userId: string, jti: string, token: string) {
    const ttlSeconds = this.parseExpirySeconds(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d');
    const key = `refresh:${userId}:${jti}`;
    const hashed = await bcrypt.hash(token, 10);
    await this.redis.getClient().set(key, hashed, 'EX', ttlSeconds);
  }

  private parseExpirySeconds(exp: string): number {
    if (exp.endsWith('d')) {
      return parseInt(exp) * 86400;
    }
    if (exp.endsWith('h')) {
      return parseInt(exp) * 3600;
    }
    if (exp.endsWith('m')) {
      return parseInt(exp) * 60;
    }
    const num = parseInt(exp);
    return Number.isNaN(num) ? 604800 : num;
  }
}
