import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Forces Google to always issue a refresh token (`access_type=offline`) and to
// re-prompt for consent (`prompt=consent`) so re-authorizing doesn't silently
// skip the refresh token on subsequent grants.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions() {
    return {
      accessType: 'offline',
      prompt: 'consent',
    };
  }
}
