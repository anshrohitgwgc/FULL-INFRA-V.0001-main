import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Server-side RBAC. The frontend sidebar hiding buttons a role can't use is
// not what stops them — this is. See README's staff/manager/admin table.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
