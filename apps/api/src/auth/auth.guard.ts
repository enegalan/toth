import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE_NAME } from './auth.constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.auth.validateSession(token);
    if (!user) {
      throw new UnauthorizedException('Session expired');
    }
    (request as Request & { user: typeof user }).user = user;
    return true;
  }
}
