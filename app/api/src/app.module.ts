import { RedisModule } from './redis/redis.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { StorageModule } from './storage/storage.module';
import { PickupsModule } from './pickups/pickups.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { CustomersModule } from './customers/customers.module';
import { MaterialsModule } from './materials/materials.module';
import { InvoicesModule } from './invoices/invoices.module';
import { InventoryModule } from './inventory/inventory.module';
import { PhotosModule } from './photos/photos.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { AuditModule } from './audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',

        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),

        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),

        database: config.get<string>('DB_DATABASE'),

        autoLoadEntities: true,
        // Schema is owned by database/migrations/*.sql, not TypeORM. This
        // must stay false — otherwise entity drift silently rewrites the
        // schema and the migrations stop being the source of truth.
        synchronize: false,
      }),
    }),

    UsersModule,

    AuthModule,

    RedisModule,

    StorageModule,

    PickupsModule,

    WarehousesModule,

    CustomersModule,

    MaterialsModule,

    InvoicesModule,

    InventoryModule,

    PhotosModule,

    TimesheetsModule,

    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Every route requires a valid JWT by default; @Public() opts out
    // (login/register/health). RolesGuard runs after and enforces @Roles().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
