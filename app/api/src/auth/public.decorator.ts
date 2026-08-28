import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route as not requiring a JWT. Used only for /auth/login,
// /auth/register (bootstrap) and the health check.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
