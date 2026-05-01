import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth';

type AuthenticatedRequest = {
  user?: {
    sub?: string;
    role?: Role;
  };
};

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener notificaciones del usuario autenticado' })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('includeRead') includeRead?: string,
  ) {
    const includeReadBool = includeRead === 'true';
    return this.notificationsService.findAllForUser(request.user?.sub ?? '', includeReadBool);
  }

  @Get('global')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener notificaciones globales' })
  findAllGlobal() {
    return this.notificationsService.findAllGlobal();
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener cantidad de notificaciones pendientes' })
  getPendingCount(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getPendingCount(request.user?.sub ?? '');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener una notificación por ID' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  markAsRead(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(id, request.user?.sub ?? '');
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Aceptar notificación' })
  accept(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.notificationsService.respondToNotification(id, request.user?.sub ?? '', 'ACCEPTED');
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rechazar notificación' })
  reject(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.notificationsService.respondToNotification(id, request.user?.sub ?? '', 'REJECTED');
  }
}