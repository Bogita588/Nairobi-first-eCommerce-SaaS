import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PoolClient } from 'pg';

@Injectable()
export class HealthService {
  constructor(private readonly db: DatabaseService) {}

  async checkDatabase(clientFromRequest?: PoolClient) {
    let client = clientFromRequest;
    try {
      if (!client) {
        client = await this.db.getClient();
      }
      await client.query('SELECT 1;');
      return { status: 'up' };
    } catch (error) {
      return { status: 'down', error: (error as Error).message };
    } finally {
      if (client && !clientFromRequest) {
        client.release();
      }
    }
  }
}
