import { SetMetadata } from '@nestjs/common';

/** Platform roles, carried in the JWT `role` claim (docs/security.md §2). */
export enum Role {
  Passenger = 'passenger',
  Driver = 'driver',
  AdminOperator = 'admin_operator',
  AdminSupervisor = 'admin_supervisor',
  AdminSuper = 'admin_super',
}

export const ADMIN_ROLES = [Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper];

export const ROLES_KEY = 'itms:roles';

/** Restrict a route to the listed roles. Enforced by RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
