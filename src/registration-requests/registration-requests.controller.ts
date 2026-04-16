import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RegistrationRequestsService } from './registration-requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RegistrationRequestStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('registration-requests')
export class RegistrationRequestsController {
  constructor(private readonly service: RegistrationRequestsService) {}

  @Get()
  findAll(@Query('status') status?: RegistrationRequestStatus) {
    return this.service.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.service.approve(id, req.user.id);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: { user: { id: string } },
  ) {
    return this.service.reject(id, req.user.id, body?.reason);
  }
}
