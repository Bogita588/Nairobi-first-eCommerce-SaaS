import { Body, Controller, Post, Req, UseInterceptors } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { RateLimit, RateLimitOptions } from '../common/decorators/rate-limit.decorator';
import { RateLimitInterceptor } from '../common/interceptors/rate-limit.interceptor';
import { RefreshDto } from './dto/refresh.dto';

type TenantRequest = Request & { tenantId?: string };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @RateLimit({ points: 5, duration: 60, keyPrefix: 'rl:login' } as RateLimitOptions)
  @UseInterceptors(RateLimitInterceptor)
  async login(@Body() body: LoginDto, @Req() req: TenantRequest) {
    const tokens = await this.authService.login(body, req.tenantId);
    return { ...tokens, tenantId: req.tenantId };
  }

  @Post('refresh')
  @RateLimit({ points: 10, duration: 60, keyPrefix: 'rl:refresh' } as RateLimitOptions)
  @UseInterceptors(RateLimitInterceptor)
  async refresh(@Body() body: RefreshDto, @Req() req: TenantRequest) {
    const tokens = await this.authService.refresh(body, req.tenantId);
    return { ...tokens, tenantId: req.tenantId };
  }
}
