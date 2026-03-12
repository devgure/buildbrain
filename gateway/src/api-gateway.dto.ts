import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsArray } from 'class-validator';

export class GatewayRouteDto {
  @ApiProperty({
    description: 'Route path pattern',
    example: '/api/v1/users/:id',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'HTTP method',
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    example: 'GET',
  })
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method: string;

  @ApiProperty({
    description: 'Target microservice URL',
    example: 'http://user-service:3002/users/:id',
  })
  @IsString()
  target: string;

  @ApiProperty({
    description: 'Whether authentication is required',
    example: true,
  })
  @IsBoolean()
  authRequired: boolean;

  @ApiProperty({
    description: 'Rate limit (requests per minute)',
    example: 100,
  })
  @IsNumber()
  rateLimit: number;
}

export class GatewayStatusDto {
  @ApiProperty({
    description: 'Gateway status',
    enum: ['HEALTHY', 'DEGRADED', 'UNHEALTHY'],
    example: 'HEALTHY',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Gateway uptime (seconds)',
    example: 3600,
  })
  @IsNumber()
  uptime: number;

  @ApiProperty({
    description: 'Number of registered routes',
    example: 45,
  })
  @IsNumber()
  routes: number;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2025-02-15T10:30:00Z',
  })
  timestamp: Date;
}

export class GatewayInfoDto {
  @ApiProperty({
    description: 'API Gateway version',
    example: '1.0.0',
  })
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2025-02-15T10:30:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Available routes',
    type: [Object],
  })
  @IsArray()
  routes: any[];
}

export class RateLimitStatusDto {
  @ApiProperty({
    description: 'Requests remaining in current window',
    example: 85,
  })
  @IsNumber()
  remaining: number;

  @ApiProperty({
    description: 'When the rate limit window resets',
    example: '2025-02-15T10:31:00Z',
  })
  reset: Date;

  @ApiPropertyOptional({
    description: 'Total requests allowed per window',
    example: 100,
  })
  limit?: number;
}

export class RequestLogDto {
  @ApiProperty({
    description: 'Request timestamp',
    example: '2025-02-15T10:30:15.123Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Client IP address',
    example: '192.168.1.100',
  })
  @IsString()
  clientIp: string;

  @ApiProperty({
    description: 'HTTP method',
    example: 'GET',
  })
  @IsString()
  method: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/v1/users/123',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'Response status code',
    example: 200,
  })
  @IsNumber()
  statusCode: number;

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 145,
  })
  @IsNumber()
  responseTime: number;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Route not found',
  })
  @IsString()
  error: string;

  @ApiPropertyOptional({
    description: 'Error details',
    example: 'The requested path does not exist',
  })
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Requested path',
    example: '/api/v1/unknown',
  })
  @IsString()
  path?: string;

  @ApiPropertyOptional({
    description: 'HTTP method',
    example: 'GET',
  })
  @IsString()
  method?: string;

  @ApiProperty({
    description: 'Timestamp',
    example: '2025-02-15T10:30:00Z',
  })
  timestamp: Date;
}

export class RateLimitExceededDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'When to retry',
    example: '2025-02-15T10:31:00Z',
  })
  retryAfter: Date;
}

export class ServiceUnavailableDto extends ErrorResponseDto {
  @ApiPropertyOptional({
    description: 'Service that failed',
    example: 'user-service',
  })
  service?: string;
}

export class ForwardedHeadersDto {
  @ApiPropertyOptional({
    description: 'Original client IP',
    example: '192.168.1.100',
  })
  @IsString()
  xForwardedFor?: string;

  @ApiPropertyOptional({
    description: 'Original request protocol',
    enum: ['http', 'https'],
    example: 'https',
  })
  @IsString()
  xForwardedProto?: string;

  @ApiPropertyOptional({
    description: 'Original host',
    example: 'api.buildbrain.io',
  })
  @IsString()
  xForwardedHost?: string;

  @ApiPropertyOptional({
    description: 'Request tracking ID',
    example: 'req-550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  xRequestId?: string;

  @ApiPropertyOptional({
    description: 'Forwarded by gateway',
    example: 'api-gateway',
  })
  @IsString()
  xForwardedBy?: string;
}

export class GatewayMetricsDto {
  @ApiProperty({
    description: 'Total requests processed',
    example: 25000,
  })
  @IsNumber()
  totalRequests: number;

  @ApiProperty({
    description: 'Successful requests (2xx)',
    example: 24000,
  })
  @IsNumber()
  successfulRequests: number;

  @ApiProperty({
    description: 'Failed requests (4xx, 5xx)',
    example: 1000,
  })
  @IsNumber()
  failedRequests: number;

  @ApiProperty({
    description: 'Rate limited requests',
    example: 50,
  })
  @IsNumber()
  rateLimited: number;

  @ApiProperty({
    description: 'Average response time (ms)',
    example: 145,
  })
  @IsNumber()
  avgResponseTime: number;

  @ApiProperty({
    description: 'P95 response time (ms)',
    example: 450,
  })
  @IsNumber()
  p95ResponseTime: number;

  @ApiProperty({
    description: 'P99 response time (ms)',
    example: 850,
  })
  @IsNumber()
  p99ResponseTime: number;
}

export class CircuitBreakerStatusDto {
  @ApiProperty({
    description: 'Service name',
    example: 'user-service',
  })
  @IsString()
  service: string;

  @ApiProperty({
    description: 'Current state',
    enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
    example: 'CLOSED',
  })
  @IsString()
  state: string;

  @ApiPropertyOptional({
    description: 'Failure rate percentage',
    example: 2.5,
  })
  @IsNumber()
  failureRate?: number;

  @ApiPropertyOptional({
    description: 'Next state transition time',
    example: '2025-02-15T10:35:00Z',
  })
  @IsString()
  nextCheck?: string;
}

export class RoutingPolicyDto {
  @ApiProperty({
    description: 'Load balancing strategy',
    enum: ['ROUND_ROBIN', 'LEAST_CONNECTIONS', 'RANDOM', 'IP_HASH'],
    example: 'ROUND_ROBIN',
  })
  @IsEnum(['ROUND_ROBIN', 'LEAST_CONNECTIONS', 'RANDOM', 'IP_HASH'])
  strategy: string;

  @ApiPropertyOptional({
    description: 'Service instances',
    type: [String],
    example: ['http://service:3001', 'http://service:3002'],
  })
  @IsArray()
  @IsString({ each: true })
  instances?: string[];

  @ApiPropertyOptional({
    description: 'Health check enabled',
    example: true,
  })
  @IsBoolean()
  healthCheckEnabled?: boolean;
}
