import { PoolClient } from 'pg';
import { AuthenticatedUser } from './common/guards/jwt-auth.guard';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      dbClient?: PoolClient;
      user?: AuthenticatedUser;
    }
  }
}

export {};
