import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { AuthModule } from '../auth/auth.module';
import { MediaService } from './media.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService]
})
export class MediaModule {}
