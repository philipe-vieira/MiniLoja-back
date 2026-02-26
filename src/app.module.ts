import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import KeyvRedis from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { LoggerModule } from './logger/logger.module';
import { HttpLoggingInterceptor } from './logger/http-logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogInterceptor } from './prisma/audit-log.interceptor';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    LoggerModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL?.trim();

        if (!redisUrl) {
          return {};
        }

        return {
          stores: [new KeyvRedis(redisUrl)],
        };
      },
    }),
    PrismaModule,
    CategoryModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
