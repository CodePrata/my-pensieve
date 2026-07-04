import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Calendar (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        calendarEvent: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /calendar/events returns an array', () => {
    return request(app.getHttpServer())
      .get('/calendar/events')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
