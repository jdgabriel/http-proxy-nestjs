import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { createProxyServer } from 'http-proxy';
import queryString from 'node:querystring';

import {
  defaultProxyOptions,
  HTTP_PROXY,
  PROXY_MODULE_OPTIONS,
} from './proxy.constants';
import { ProxyController } from './proxy.controller';
import {
  ProxyModuleAsyncOptions,
  ProxyModuleOptions,
  ProxyModuleOptionsFactory,
} from './proxy.interface';
import { ProxyService } from './proxy.service';
import { concatPath } from './proxy.utils';

const proxyFactory = {
  provide: HTTP_PROXY,
  useFactory: async (options: ProxyModuleOptions) => {
    const logger = new Logger('Proxy');
    const proxy = createProxyServer({
      ...defaultProxyOptions,
      ...options.config,
    });

    proxy.on('proxyReq', function (proxyReq, req, _res, _opts) {
      const url = concatPath(`${proxyReq.protocol}//${proxyReq.host}`, req.url);
      logger.log(`Sending ${req.method} ${url}`);

      let cookies = (proxyReq.getHeader('cookie') || '') as string;
      const allowedCookies = options.allowedCookies || [];
      cookies = cookies
        .split(';')
        .filter(
          (cookie) =>
            allowedCookies.indexOf(cookie.split('=')[0].trim()) !== -1,
        )
        .join(';');

      proxyReq.setHeader('cookie', cookies);

      if (!req['body'] || !Object.keys(req['body']).length) {
        return;
      }

      const contentType = proxyReq.getHeader('Content-Type');
      let bodyData: string;

      if (contentType === 'application/json') {
        bodyData = JSON.stringify(req['body']);
      }

      if (contentType === 'application/x-www-form-urlencoded') {
        bodyData = queryString.stringify(req['body']);
      }

      if (bodyData) {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    });

    proxy.on('proxyRes', function (proxyRes, req, _res) {
      const url = concatPath(
        `${proxyRes['req'].protocol}//${proxyRes['req'].host}`,
        req.url,
      );
      logger.log(`Received ${req.method} ${url}`);
    });
    return proxy;
  },
  inject: [PROXY_MODULE_OPTIONS],
};

@Module({
  providers: [ProxyService, proxyFactory],
  controllers: [ProxyController],
})
export class ProxyModule {
  static forRootAsync(options: ProxyModuleAsyncOptions): DynamicModule {
    return {
      module: ProxyModule,
      imports: options.imports,
      providers: [...this.createAsyncProviders(options)],
    };
  }

  private static createAsyncProviders(
    options: ProxyModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ProxyModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: PROXY_MODULE_OPTIONS,
        useFactory: async (...args: any[]) => await options.useFactory(...args),
        inject: options.inject || [],
      };
    }
    return {
      provide: PROXY_MODULE_OPTIONS,
      useFactory: async (optionsFactory: ProxyModuleOptionsFactory) =>
        await optionsFactory.createModuleConfig(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
