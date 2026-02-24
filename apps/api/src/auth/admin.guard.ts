import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE_NAME } from './auth.constants';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    if (!token) {
      throw new ForbiddenException('Not authenticated');
    }
    const user = await this.auth.validateSession(token);
    if (!user) {
      throw new ForbiddenException('Session expired');
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    (request as Request & { user: typeof user }).user = user;
    return true;
  }
}
