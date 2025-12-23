import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CatalogController, InventoryController],
  providers: [CatalogService, InventoryService]
})
export class CatalogModule {}
