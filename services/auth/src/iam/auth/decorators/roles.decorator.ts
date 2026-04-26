import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Clave de metadatos utilizada para almacenar los roles requeridos.
 * Se utiliza junto con SetMetadata de NestJS.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador para definir los roles requeridos en un endpoint.
 * Se utiliza en controladores para proteger endpoints con RBAC.
 *
 * Uso:
 * ```typescript
 * @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin')
 * ```
 *
 * @param roles - Roles permitidos para acceder al endpoint
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
