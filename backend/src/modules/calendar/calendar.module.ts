import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../prisma/prisma.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleOAuthStrategy } from './google-oauth.strategy';

@Module({
  imports: [
    PrismaModule,
    // Scoped to this module only (not `isGlobal`) so other modules are left
    // untouched — ConfigService is only needed for Google OAuth here.
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'google' }),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, GoogleOAuthStrategy, GoogleAuthGuard],
})
export class CalendarModule {}
