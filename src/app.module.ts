import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { envSchema } from './module/environments/env';
import { EnvModule } from './module/environments/env.module';
import { EnvService } from './module/environments/env.service';
import { ProxyConfigService } from './module/proxy/proxy-config.service';
import { ProxyModule } from './module/proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    ProxyModule.forRootAsync({
      inject: [EnvService],
      useClass: ProxyConfigService,
    }),
    EnvModule,
  ],
})
export class AppModule {}
