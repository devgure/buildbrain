import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ApiGatewayService } from './api-gateway.service';
import axios, { AxiosError } from 'axios';

@ApiTags('API Gateway')
@Controller()
export class ApiGatewayController {
  constructor(private gatewayService: ApiGatewayService) {
    // Cleanup old logs every 5 minutes
    setInterval(() => this.gatewayService.cleanupOldLogs(), 5 * 60 * 1000);
  }

  /**
   * Gateway health check
   */
  @Get('/health')
  @ApiOperation({
    summary: 'Gateway health',
    description: 'Check API gateway health',
  })
  @ApiOkResponse({
    description: 'Gateway is healthy',
  })
  health() {
    return this.gatewayService.getStatus();
  }

  /**
   * Gateway info
   */
  @Get('/info')
  @ApiOperation({
    summary: 'Gateway information',
    description: 'Get API gateway information and available routes',
  })
  info() {
    const routes = this.gatewayService.getAllRoutes();
    return {
      version: '1.0.0',
      timestamp: new Date(),
      routes: routes.map(r => ({
        path: r.path,
        method: r.method,
        authRequired: r.authRequired,
        rateLimit: r.rateLimit,
      })),
    };
  }

  /**
   * Forward all other requests
   */
  @Get('/*')
  @Post('/*')
  @Put('/*')
  @Patch('/*')
  @Delete('/*')
  async forwardRequest(@Req() request: Request, @Res() response: Response) {
    const startTime = Date.now();
    const clientIp = this.getClientIp(request);
    const method = request.method;
    const path = request.path;

    try {
      // Get route configuration
      const route = this.gatewayService.getRoute(method, path);

      if (!route) {
        const statusCode = HttpStatus.NOT_FOUND;
        this.gatewayService.logRequest(clientIp, method, path, statusCode, Date.now() - startTime);
        return response.status(statusCode).json({
          error: 'Route not found',
          path,
          method,
        });
      }

      // Check rate limit
      if (!this.gatewayService.checkRateLimit(clientIp, route.rateLimit)) {
        const statusCode = HttpStatus.TOO_MANY_REQUESTS;
        const rateLimitStatus = this.gatewayService.getRateLimitStatus(
          clientIp,
          route.rateLimit,
        );

        this.gatewayService.logRequest(clientIp, method, path, statusCode, Date.now() - startTime);

        response.setHeader('Retry-After', Math.ceil((rateLimitStatus.reset.getTime() - Date.now()) / 1000));
        return response.status(statusCode).json({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitStatus.reset,
        });
      }

      // Build target URL
      const targetUrl = this.buildTargetUrl(route.target, path, request.query);

      // Prepare headers
      const headers = this.prepareHeaders(request, route.authRequired);

      // Forward request
      const axiosConfig = {
        method,
        url: targetUrl,
        headers,
        data: ['POST', 'PUT', 'PATCH'].includes(method) ? request.body : undefined,
        validateStatus: () => true, // Don't throw on any status code
      };

      const axiosResponse = await axios(axiosConfig);

      // Set response headers
      this.setResponseHeaders(response, axiosResponse, route.rateLimit, clientIp);

      // Send response
      response.status(axiosResponse.status).json(axiosResponse.data);

      // Log request
      this.gatewayService.logRequest(clientIp, method, path, axiosResponse.status, Date.now() - startTime);
    } catch (error) {
      const statusCode = HttpStatus.BAD_GATEWAY;
      const errorMessage = error instanceof AxiosError
        ? error.message
        : 'Unknown error';

      this.gatewayService.logRequest(clientIp, method, path, statusCode, Date.now() - startTime);

      return response.status(statusCode).json({
        error: 'Service unavailable',
        message: errorMessage,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.connection.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Build target URL
   */
  private buildTargetUrl(target: string, path: string, query: any): string {
    let url = target;

    // Replace path parameters
    const pathParts = path.split('/');
    const targetParts = target.split('/');

    for (let i = 0; i < pathParts.length; i++) {
      if (targetParts[i]?.startsWith(':')) {
        targetParts[i] = pathParts[i];
      }
    }

    url = targetParts.join('/');

    // Add query string
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Prepare request headers
   */
  private prepareHeaders(request: Request, authRequired: boolean): Record<string, string> {
    const headers: Record<string, string> = {};

    // Copy useful headers
    const headersToForward = [
      'content-type',
      'authorization',
      'user-agent',
      'accept',
      'accept-language',
      'accept-encoding',
      'cache-control',
      'x-request-id',
    ];

    for (const headerName of headersToForward) {
      const value = request.headers[headerName];
      if (value) {
        headers[headerName] = Array.isArray(value) ? value[0] : value;
      }
    }

    // Add gateway tracking header
    headers['x-forwarded-by'] = 'api-gateway';
    headers['x-forwarded-for'] = this.getClientIp(request);
    headers['x-forwarded-proto'] = request.protocol;

    return headers;
  }

  /**
   * Set response headers
   */
  private setResponseHeaders(
    response: Response,
    axiosResponse: any,
    rateLimit: number,
    clientIp: string,
  ) {
    const rateLimitStatus = this.gatewayService.getRateLimitStatus(clientIp, rateLimit);

    // Copy headers from upstream service
    if (axiosResponse.headers) {
      for (const [key, value] of Object.entries(axiosResponse.headers)) {
        if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          response.setHeader(key, value as string);
        }
      }
    }

    // Add rate limit headers
    response.setHeader('X-RateLimit-Limit', rateLimit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitStatus.remaining));
    response.setHeader('X-RateLimit-Reset', rateLimitStatus.reset.toISOString());

    // Add gateway identifier
    response.setHeader('X-Powered-By', 'BuildBrain-API-Gateway');
  }
}
