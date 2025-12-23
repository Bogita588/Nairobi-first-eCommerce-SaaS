import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit_options';

export type RateLimitOptions = {
  points: number;
  duration: number;
  blockDuration?: number;
  keyPrefix?: string;
};

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
