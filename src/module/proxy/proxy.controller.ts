import {
  All,
  Controller,
  Logger,
  Request as NestRequest,
  Param,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private proxyService: ProxyService) {}

  @All()
  async proxy(
    @Res() response: Response,
    @NestRequest() request: Request,
    @Param() params: any,
  ) {
    try {
      this.proxyService.proxyRequest(request, response, params);
    } catch (err) {
      const msg = 'An error occurred while making the proxy call';

      response.status(500).send({ error: msg });

      this.logger.error(msg, err);
    }
  }
}
