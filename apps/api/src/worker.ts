import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { ConfigService } from '@nestjs/config';

async function bootstrapWorker() {
  const logger = new Logger('Worker');
  const config = new ConfigService();
  const db = new DatabaseService(config);
  const client = await db.getClient();
  await client.query('SET app.current_tenant = $1', [config.get<string>('DEFAULT_TENANT_ID') || null]);
  logger.log('Worker started (stub). Add BullMQ consumers here.');
  client.release();
}

bootstrapWorker().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
