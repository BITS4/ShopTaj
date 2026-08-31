import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import type { Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleAuthUser {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL: config.get('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google profile did not provide an email address'), false);
      return;
    }

    const fullName = [profile.name?.givenName, profile.name?.familyName]
      .filter((part): part is string => Boolean(part))
      .join(' ') || profile.displayName;

    const user: GoogleAuthUser = {
      googleId: profile.id,
      email,
      fullName,
      avatarUrl: profile.photos?.[0]?.value,
    };

    done(null, {
      ...user,
    });
  }
}
