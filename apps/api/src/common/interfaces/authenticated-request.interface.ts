import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  householdId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
