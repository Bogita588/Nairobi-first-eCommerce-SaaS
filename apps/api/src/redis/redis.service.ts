import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379/0';
    this.client = new Redis(url, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized. Check REDIS_URL and Redis service.');
    }
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
