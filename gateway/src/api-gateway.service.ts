import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GatewayRoute {
  path: string;
  method: string;
  target: string; // microservice URL
  authRequired: boolean;
  rateLimit: number; // requests per minute
}

export interface RateLimitConfig {
  windowMs: number; // time window in ms
  maxRequests: number; // max requests per window
}

@Injectable()
export class ApiGatewayService {
  private routes: Map<string, GatewayRoute> = new Map();
  private rateLimits: Map<string, RateLimitConfig> = new Map();
  private requestLogs: Map<string, number[]> = new Map(); // IP -> timestamps

  constructor(private configService: ConfigService) {
    this.initializeRoutes();
    this.initializeRateLimits();
  }

  /**
   * Initialize available routes
   */
  private initializeRoutes() {
    const baseServices = {
      auth: this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001',
      users: this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3002',
      projects: this.configService.get<string>('PROJECT_SERVICE_URL') || 'http://localhost:3003',
      marketplace: this.configService.get<string>('MARKETPLACE_SERVICE_URL') || 'http://localhost:3004',
      payments: this.configService.get<string>('PAYMENT_SERVICE_URL') || 'http://localhost:3005',
      notifications: this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://localhost:3006',
      analytics: this.configService.get<string>('ANALYTICS_SERVICE_URL') || 'http://localhost:3007',
      govProcurement: this.configService.get<string>('GOV_PROCUREMENT_SERVICE_URL') || 'http://localhost:3008',
      compliance: this.configService.get<string>('COMPLIANCE_SERVICE_URL') || 'http://localhost:3009',
      documents: this.configService.get<string>('DOCUMENT_SERVICE_URL') || 'http://localhost:3010',
    };

    // Auth routes (no auth required for login/register)
    this.registerRoute('/api/v1/auth/register', 'POST', `${baseServices.auth}/register`, false, 10);
    this.registerRoute('/api/v1/auth/login', 'POST', `${baseServices.auth}/login`, false, 10);
    this.registerRoute('/api/v1/auth/refresh', 'POST', `${baseServices.auth}/refresh`, true, 50);
    this.registerRoute('/api/v1/auth/validate', 'GET', `${baseServices.auth}/validate`, true, 100);

    // User routes
    this.registerRoute('/api/v1/users/:id', 'GET', `${baseServices.users}/users/:id`, false, 100);
    this.registerRoute('/api/v1/users/:id', 'PATCH', `${baseServices.users}/users/:id`, true, 50);
    this.registerRoute('/api/v1/users/me', 'GET', `${baseServices.users}/users/me`, true, 100);
    this.registerRoute('/api/v1/users/search/:query', 'GET', `${baseServices.users}/users/search/:query`, true, 100);

    // Project routes
    this.registerRoute('/api/v1/projects', 'GET', `${baseServices.projects}/projects`, true, 100);
    this.registerRoute('/api/v1/projects', 'POST', `${baseServices.projects}/projects`, true, 50);
    this.registerRoute('/api/v1/projects/:id', 'GET', `${baseServices.projects}/projects/:id`, true, 100);
    this.registerRoute('/api/v1/projects/:id', 'PATCH', `${baseServices.projects}/projects/:id`, true, 50);

    // Marketplace routes
    this.registerRoute('/api/v1/marketplace/bids', 'GET', `${baseServices.marketplace}/bids`, true, 100);
    this.registerRoute('/api/v1/marketplace/bids', 'POST', `${baseServices.marketplace}/bids`, true, 50);
    this.registerRoute('/api/v1/marketplace/jobs', 'GET', `${baseServices.marketplace}/jobs`, true, 100);

    // Payment routes
    this.registerRoute('/api/v1/payments', 'POST', `${baseServices.payments}/payments`, true, 30);
    this.registerRoute('/api/v1/payments/:id', 'GET', `${baseServices.payments}/payments/:id`, true, 100);
    this.registerRoute('/api/v1/payments/history', 'GET', `${baseServices.payments}/payments/history`, true, 100);

    // Notification routes
    this.registerRoute('/api/v1/notifications/send', 'POST', `${baseServices.notifications}/notifications/send`, true, 50);
    this.registerRoute('/api/v1/notifications/history', 'GET', `${baseServices.notifications}/notifications/history`, true, 100);

    // Analytics routes
    this.registerRoute('/api/v1/analytics/dashboard', 'GET', `${baseServices.analytics}/analytics/dashboard`, true, 50);
    this.registerRoute('/api/v1/analytics/:metric', 'GET', `${baseServices.analytics}/analytics/:metric`, true, 100);

    // Government Procurement routes
    this.registerRoute('/api/v1/gov-procurement/search', 'GET', `${baseServices.govProcurement}/gov-procurement/search`, true, 50);
    this.registerRoute('/api/v1/gov-procurement/matches', 'GET', `${baseServices.govProcurement}/gov-procurement/matches`, true, 50);

    // Compliance routes
    this.registerRoute('/api/v1/compliance/kyc/:userId', 'GET', `${baseServices.compliance}/compliance/kyc/:userId`, true, 100);

    // Document routes
    this.registerRoute('/api/v1/documents', 'POST', `${baseServices.documents}/documents`, true, 50);
    this.registerRoute('/api/v1/documents/:id', 'GET', `${baseServices.documents}/documents/:id`, true, 100);
  }

  /**
   * Initialize rate limit configurations
   */
  private initializeRateLimits() {
    // Global default
    this.rateLimits.set('default', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    });

    // Strict limits
    this.rateLimits.set('strict', {
      windowMs: 60 * 1000,
      maxRequests: 10,
    });

    // Moderate limits
    this.rateLimits.set('moderate', {
      windowMs: 60 * 1000,
      maxRequests: 50,
    });

    // Generous limits
    this.rateLimits.set('generous', {
      windowMs: 60 * 1000,
      maxRequests: 200,
    });
  }

  /**
   * Register a route
   */
  registerRoute(
    path: string,
    method: string,
    target: string,
    authRequired: boolean,
    rateLimit: number,
  ) {
    const key = `${method} ${path}`;
    this.routes.set(key, {
      path,
      method,
      target,
      authRequired,
      rateLimit,
    });
  }

  /**
   * Get route configuration
   */
  getRoute(method: string, path: string): GatewayRoute | null {
    // First try exact match
    const key = `${method} ${path}`;
    if (this.routes.has(key)) {
      return this.routes.get(key) || null;
    }

    // Try pattern matching (e.g., /api/v1/users/:id)
    for (const [routeKey, route] of this.routes) {
      if (this.matchRoute(path, route.path) && route.method === method) {
        return route;
      }
    }

    return null;
  }

  /**
   * Check if request is within rate limit
   */
  checkRateLimit(clientIp: string, rateLimit: number): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    if (!this.requestLogs.has(clientIp)) {
      this.requestLogs.set(clientIp, []);
    }

    const timestamps = this.requestLogs.get(clientIp) || [];

    // Remove old timestamps (outside window)
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);

    // Check if limit exceeded
    if (recentTimestamps.length >= rateLimit) {
      return false;
    }

    // Add current request
    recentTimestamps.push(now);
    this.requestLogs.set(clientIp, recentTimestamps);

    return true;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(
    clientIp: string,
    rateLimit: number,
  ): { remaining: number; reset: Date } {
    const now = Date.now();
    const windowMs = 60 * 1000;

    if (!this.requestLogs.has(clientIp)) {
      return {
        remaining: rateLimit,
        reset: new Date(now + windowMs),
      };
    }

    const timestamps = this.requestLogs.get(clientIp) || [];
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);

    const remaining = Math.max(0, rateLimit - recentTimestamps.length);
    const oldestRequest = recentTimestamps[0];
    const resetTime = oldestRequest
      ? new Date(oldestRequest + windowMs)
      : new Date(now + windowMs);

    return { remaining, reset: resetTime };
  }

  /**
   * Log request
   */
  logRequest(
    clientIp: string,
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
  ) {
    const logEntry = {
      timestamp: new Date(),
      clientIp,
      method,
      path,
      statusCode,
      responseTime, // ms
    };

    console.log(
      `[${logEntry.timestamp.toISOString()}] ${method} ${path} - ${statusCode} - ${responseTime}ms - ${clientIp}`,
    );

    // Could store in database or logging service
  }

  /**
   * Get all routes
   */
  getAllRoutes(): GatewayRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get gateway status
   */
  getStatus() {
    return {
      status: 'HEALTHY',
      uptime: process.uptime(),
      routes: this.routes.size,
      timestamp: new Date(),
    };
  }

  /**
   * Clear old request logs (cleanup)
   */
  cleanupOldLogs() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [clientIp, timestamps] of this.requestLogs) {
      const validTimestamps = timestamps.filter(ts => now - ts < maxAge);

      if (validTimestamps.length === 0) {
        this.requestLogs.delete(clientIp);
      } else {
        this.requestLogs.set(clientIp, validTimestamps);
      }
    }
  }

  /**
   * Match route pattern
   */
  private matchRoute(path: string, pattern: string): boolean {
    const pathParts = path.split('/');
    const patternParts = pattern.split('/');

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // Parameter, matches anything
        continue;
      }

      if (pathParts[i] !== patternParts[i]) {
        return false;
      }
    }

    return true;
  }
}
