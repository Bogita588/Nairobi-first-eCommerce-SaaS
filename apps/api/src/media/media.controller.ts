import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MediaService } from './media.service';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('upload-sign')
  @Roles('owner', 'staff')
  signUpload(
    @Query('filename') filename: string,
    @Query('contentType') contentType: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.mediaService.signUpload(filename || 'file', contentType || 'application/octet-stream', user.tenantId);
  }
}
