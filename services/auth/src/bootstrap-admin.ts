import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { v7 as uuidv7 } from 'uuid';
import { Role } from '@itms/auth';
import { AppDataSource } from './data-source';
import { User, UserStatus } from './entities/user.entity';

/**
 * One-time bootstrap for the very first Super Admin account (docs/security.md
 * §1). Without this there is no way to log into the Admin Panel: admin
 * accounts authenticate with email + password + TOTP, and nothing else in the
 * system can create the *first* one (the internal /internal/users endpoint
 * only provisions phone+OTP driver/passenger accounts).
 *
 * Usage:
 *   ADMIN_BOOTSTRAP_EMAIL=admin@itms.example \
 *   ADMIN_BOOTSTRAP_PASSWORD='at-least-8-chars' \
 *   npm run -w @itms/auth-service bootstrap:admin
 *
 * Idempotent: if a user with this email already exists, no credentials are
 * overwritten — it just re-reports the existing account (and, if
 * ADMIN_BOOTSTRAP_JSON_OUT is set, re-emits the same TOTP secret so
 * scripts/smoke-test.mjs can run repeatedly against an already-bootstrapped
 * stack without hand-holding).
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const jsonOut = process.env.ADMIN_BOOTSTRAP_JSON_OUT;
  if (!email || !password) {
    console.error('Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD to bootstrap the first admin.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);

  const existing = await users.findOne({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (role=${existing.role}, status=${existing.status}). No changes made.`);
    if (jsonOut && existing.totpSecret) {
      writeFileSync(jsonOut, JSON.stringify({ email, totpSecret: existing.totpSecret }, null, 2));
    }
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await argon2.hash(password);
  const totpSecret = authenticator.generateSecret();
  // Admins authenticate by email, not phone — this column is NOT NULL/unique
  // in the schema for OTP-based accounts, so admins get a clearly-marked
  // placeholder that can never collide with a real +92 number.
  const placeholderPhone = `admin:${randomBytes(8).toString('hex')}`;

  const user = users.create({
    id: uuidv7(),
    phone: placeholderPhone,
    phoneVerifiedAt: null,
    email,
    passwordHash,
    role: Role.AdminSuper,
    status: UserStatus.Active,
    totpSecret,
    lastLoginAt: null,
  });
  await users.save(user);

  const otpauthUri = authenticator.keyuri(email, 'ITMS Admin', totpSecret);

  console.log('\nSuper Admin created.');
  console.log(`  Email:    ${email}`);
  console.log(`  Role:     ${Role.AdminSuper}`);
  console.log('\nScan this into an authenticator app (Google Authenticator, 1Password, etc.):');
  console.log(`  ${otpauthUri}`);
  console.log(`\nOr enter the secret manually: ${totpSecret}`);
  console.log('\nThis secret is shown once. If lost, delete the user row and re-run this script.\n');

  if (jsonOut) {
    // For automated testing only (scripts/smoke-test.mjs) — a real operator
    // should use the otpauth:// URI above, not this file.
    writeFileSync(jsonOut, JSON.stringify({ email, totpSecret }, null, 2));
  }

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
