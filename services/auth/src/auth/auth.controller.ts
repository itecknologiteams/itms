import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@itms/auth';
import {
  AdminLoginDto,
  AdminTotpDto,
  LogoutDto,
  OtpRequestDto,
  OtpVerifyDto,
  RefreshDto,
} from './dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  @HttpCode(202)
  @ApiOperation({ summary: 'Request an OTP for the given phone and purpose' })
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.auth.requestOtp(dto.phone, dto.purpose);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP; returns access + refresh tokens' })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.purpose, dto.device);
  }

  @Public()
  @Post('token/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: LogoutDto) {
    await this.auth.logout(dto.refresh_token);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin login step 1 — credentials, returns TOTP challenge' })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.email, dto.password);
  }

  @Public()
  @Post('admin/totp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin login step 2 — verify TOTP, returns tokens' })
  adminTotp(@Body() dto: AdminTotpDto) {
    return this.auth.adminTotp(dto.challenge_id, dto.code);
  }
}
