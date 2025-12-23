import { CallHandler, ExecutionContext, Injectable, NestInterceptor, TooManyRequestsException } from '@nestjs/common';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private limiter: RateLimiterRedis;

  constructor(private readonly redisService: RedisService, private readonly reflector: Reflector) {
    this.limiter = new RateLimiterRedis({
      storeClient: this.redisService.getClient(),
      points: 10,
      duration: 60,
      keyPrefix: 'rl'
    });
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const key = this.buildKey(request);
    const opts = this.getOptions(context);
    const limiter = this.getLimiter(opts);

    try {
      await limiter.consume(key);
      return next.handle();
    } catch (err) {
      const res = err as RateLimiterRes;
      const retrySecs = Math.round(res?.msBeforeNext / 1000) || 1;
      throw new TooManyRequestsException(`Too many requests. Retry in ${retrySecs}s`);
    }
  }

  private getOptions(context: ExecutionContext): RateLimitOptions | undefined {
    return this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
  }

  private getLimiter(options?: RateLimitOptions) {
    if (!options) return this.limiter;
    return new RateLimiterRedis({
      storeClient: this.redisService.getClient(),
      points: options.points,
      duration: options.duration,
      blockDuration: options.blockDuration,
      keyPrefix: options.keyPrefix || 'rl'
    });
  }

  private buildKey(request: { ip?: string; connection?: { remoteAddress?: string }; path?: string; tenantId?: string }) {
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const path = request.path || '';
    const tenant = request.tenantId || 'no-tenant';
    return `${tenant}:${path}:${ip}`;
  }
}
