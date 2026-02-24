import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, AuthUser } from './auth.service';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './auth.dto';
import { SESSION_COOKIE_NAME } from './auth.constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: { email: string; password: string },
    @Res({ passthrough: false }) res: Response,
  ) {
    const { email, password } = dto;
    if (!email?.trim() || !password) {
      throw new UnauthorizedException('Email and password required');
    }
    const { user, token, expiresAt } = await this.auth.register(
      email.trim(),
      password,
    );
    this.setSessionCookie(res, token, expiresAt);
    res.json({ user });
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { email, password } = dto;
    if (!email?.trim() || !password) {
      throw new UnauthorizedException('Email and password required');
    }
    const { user, token, expiresAt } = await this.auth.login(
      email.trim(),
      password,
    );
    this.setSessionCookie(res, token, expiresAt);
    res.json({ user });
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (token) {
      await this.auth.logout(token);
    }
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    res.json({ ok: true });
  }

  @Get('me')
  async me(@Req() req: Request): Promise<{ user: AuthUser | null }> {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token) {
      return { user: null };
    }
    const user = await this.auth.validateSession(token);
    return { user };
  }

  private setSessionCookie(
    res: Response,
    token: string,
    expiresAt: Date,
  ): void {
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: expiresAt.getTime() - Date.now(),
    });
  }
}
