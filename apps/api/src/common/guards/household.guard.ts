import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@Injectable()
export class HouseholdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const householdId = request.params.householdId || request.params.id;

    if (request.user.householdId !== householdId) {
      throw new ForbiddenException('You do not have access to this household');
    }
    return true;
  }
}
