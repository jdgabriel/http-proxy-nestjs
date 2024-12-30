import { Injectable } from '@nestjs/common';

import { EnvService } from '../environments/env.service';
import {
  ProxyModuleOptions,
  ProxyModuleOptionsFactory,
} from './proxy.interface';

@Injectable()
export class ProxyConfigService implements ProxyModuleOptionsFactory {
  constructor(private env: EnvService) {}

  createModuleConfig(): ProxyModuleOptions {
    return {
      services: this.env.get('ALL_SERVICES') ?? {},
      allowedCookies: [],
      config: {},
    };
  }
}
