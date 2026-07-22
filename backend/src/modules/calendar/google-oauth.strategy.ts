import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, StrategyOptions } from 'passport-google-oauth20';

export interface GoogleOAuthTokenResult {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number | undefined;
  scope: string | undefined;
  tokenType: string | undefined;
  profile: Profile;
}

interface GoogleTokenParams {
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

// `callbackArity: true` tells the @nestjs/passport mixin to compute the verify
// callback's arity from `validate`'s own parameter count, so passport-oauth2
// invokes it with the raw token-exchange `params` (needed for `expires_in`)
// instead of the default (accessToken, refreshToken, profile) signature.
@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(
  Strategy,
  'google',
  true,
) {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_REDIRECT_URI'),
      scope: ['https://www.googleapis.com/auth/calendar.readonly', 'profile'],
    } as StrategyOptions);
  }

  validate(
    accessToken: string,
    refreshToken: string | undefined,
    params: GoogleTokenParams,
    profile: Profile,
  ): GoogleOAuthTokenResult {
    return {
      accessToken,
      refreshToken,
      expiresIn: params?.expires_in,
      scope: params?.scope,
      tokenType: params?.token_type,
      profile,
    };
  }
}
