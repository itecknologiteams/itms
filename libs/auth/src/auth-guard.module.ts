import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy, JWT_VERIFY_OPTIONS, JwtVerifyOptions } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

/**
 * Drop-in authentication + authorization for any service. Registers the JWT
 * strategy and applies JwtAuthGuard + RolesGuard globally, so every route is
 * authenticated-by-default unless marked @Public() (docs/security.md §2).
 *
 * The Auth service itself does NOT use this (it issues tokens); it guards its
 * authenticated routes explicitly.
 */
@Module({})
export class AuthGuardModule {
  static forRoot(opts: JwtVerifyOptions): DynamicModule {
    return {
      module: AuthGuardModule,
      imports: [PassportModule],
      providers: [
        { provide: JWT_VERIFY_OPTIONS, useValue: opts },
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
      exports: [PassportModule],
    };
  }
}
