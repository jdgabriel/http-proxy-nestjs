import { Inject, Injectable, Logger, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import * as server from 'http-proxy';

import {
  HTTP_HEADER_NAME,
  HTTP_PROXY,
  PROXY_MODULE_OPTIONS,
} from './proxy.constants';
import { ProxyModuleOptions } from './proxy.interface';
import { concatPath, getBaseURL } from './proxy.utils';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    @Inject(HTTP_PROXY) private proxy: server | any,
    @Inject(PROXY_MODULE_OPTIONS) private options: ProxyModuleOptions,
  ) {}

  async proxyRequest(req: Request, res: Response, @Param() params?: any) {
    const target = req.query.target as string;
    const serviceName = req.headers[HTTP_HEADER_NAME] as string;
    const serviceToken = req.headers['authorization'] ?? undefined;

    const prefix = params ? `${params[0]}` : '';

    if (target && !serviceName) {
      const error = `Cannot make a proxy call without a service name`;
      this.logger.warn(error);
      return res.status(500).send({
        error,
      });
    }

    if (serviceName) {
      const serviceUrl = this.options.services[serviceName];
      if (serviceUrl) {
        return this.doProxy(
          req,
          res,
          target ? concatPath(serviceUrl, prefix, target) : serviceUrl,
          serviceToken ?? null,
        );
      } else {
        const error = `Could not find service name ${serviceName}`;
        this.logger.warn(error);
        return res.status(404).send({
          error,
        });
      }
    }

    const error = `Could not find 'target' or '${HTTP_HEADER_NAME}'`;

    res.status(404).send({ error });
    this.logger.error(error);
  }

  private async doProxy(
    req: Request,
    res: Response,
    target: string,
    token: string,
    options: server.ServerOptions = {},
  ) {
    const url = new URL(target);
    req.url = `${url.pathname}${url.search}`;

    const defaultOptions = {
      target: getBaseURL(target),
      headers: {
        ...(token && { authorization: 'Bearer ' + token }),
      },
    };

    // Set default "Accept" header if not provided by request headers or is set to "*/*"
    if (!('accept' in req.headers) || req.headers.accept === '*/*') {
      defaultOptions.headers['accept'] = 'application/json';
    }

    // Set default "Content-Type" header if not provided by request headers
    if (!('content-type' in req.headers)) {
      defaultOptions.headers['content-type'] = 'application/json';
    }

    // Allow http-server options overriding
    const requestOptions = { ...defaultOptions, ...options };
    requestOptions.headers = {
      ...defaultOptions.headers,
      ...(options && options.headers),
    }; // To deep extend headers

    this.proxy.web(req, res, requestOptions, (err) => {
      if (err.code === 'ECONNRESET') return;

      this.logger.error(
        `Error ${err.code} while proxying ${req.method} ${req.url}`,
      );

      res.writeHead(500, {
        'Content-Type': 'text/plain',
      });

      res.end('An error occurred while proxying the request');
    });
  }
}
