import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'itms:isPublic';

/** Marks a route as not requiring authentication (e.g. OTP request, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
