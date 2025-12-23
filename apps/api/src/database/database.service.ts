import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL not set. Populate .env or export DATABASE_URL.');
    }
    this.pool = new Pool({
      connectionString,
      max: 10,
      ssl: false
    });
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
