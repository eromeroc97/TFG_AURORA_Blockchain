import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard para Control de Acceso Basado en Roles (RBAC).
 * Verifica que el usuario autenticado tenga uno de los roles requeridos
 * para acceder al endpoint.
 *
 * Propósito de seguridad:
 * - Implementa RBAC (Role-Based Access Control)
 * - Restringe el acceso a endpoints según el rol del usuario
 * - Se utiliza junto con el decorador @Roles()
 *
 * @Injectable() - Proveído a nivel de módulo
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
	 * Determina si el usuario tiene acceso al endpoint.
	 * Compara los roles del usuario con los roles requeridos del decorador.
	 *
	 * @param context - Contexto de ejecución de NestJS
	 * @returns true si el acceso está autorizado, false en caso contrário
	 */
	canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
