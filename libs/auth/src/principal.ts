import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from './roles';

/** Authenticated caller, attached to the request by JwtStrategy. */
export interface Principal {
  userId: string;
  role: Role;
  deviceId?: string;
}

/** Raw JWT claims issued by the Auth service. */
export interface JwtClaims {
  sub: string;
  role: Role;
  device_id?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

/** Injects the current Principal into a controller handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as Principal;
  },
);
