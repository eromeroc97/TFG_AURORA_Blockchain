import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtStrategy } from './jwt.strategy';

@Injectable()
export class JwtAuthGuard extends JwtStrategy implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    if (!token) {
      throw new UnauthorizedException('Token de autorización requerido');
    }

    try {
      const payload = this.validate(token);
      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }
    return parts[1];
  }
}
