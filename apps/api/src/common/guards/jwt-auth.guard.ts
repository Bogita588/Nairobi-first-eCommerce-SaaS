import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';

export type AuthenticatedUser = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = await this.authService.verify(token);
      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }
      if (request.tenantId && payload.tenantId !== request.tenantId) {
        throw new UnauthorizedException('Tenant mismatch');
      }

      const user: AuthenticatedUser = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email
      };
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
