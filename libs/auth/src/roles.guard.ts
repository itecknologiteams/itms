import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError } from '@itms/common';
import { Principal } from './principal';
import { Role, ROLES_KEY } from './roles';

/**
 * Enforces @Roles(...) on routes. Runs after JwtAuthGuard, so request.user is set.
 * Routes with no @Roles decorator are allowed for any authenticated user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as Principal | undefined;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenError('ROLE_NOT_PERMITTED', 'Your role may not perform this action');
    }
    return true;
  }
}
