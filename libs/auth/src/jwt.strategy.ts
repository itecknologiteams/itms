import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtClaims, Principal } from './principal';

export const JWT_VERIFY_OPTIONS = Symbol('JWT_VERIFY_OPTIONS');

export interface JwtVerifyOptions {
  /** RS256 public key (PEM) used to verify access tokens. */
  publicKey: string;
  issuer: string;
}

/**
 * Verifies RS256 access tokens issued by the Auth service and maps claims to a
 * Principal. Services trust the token signature (Kong also verifies at the edge,
 * docs/security.md §2) and enforce role/ownership themselves.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(JWT_VERIFY_OPTIONS) opts: JwtVerifyOptions) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: opts.publicKey,
      issuer: opts.issuer,
    });
  }

  validate(claims: JwtClaims): Principal {
    return { userId: claims.sub, role: claims.role, deviceId: claims.device_id };
  }
}
