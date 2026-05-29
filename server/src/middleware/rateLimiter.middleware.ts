import { Request, Response, NextFunction } from 'express';

const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const maxRequestsPerWindow = 5;
const ipRequests = new Map<string, { count: number; resetTime: number }>();

export function leadRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  const now = Date.now();
  const requestInfo = ipRequests.get(ip);

  if (!requestInfo || now > requestInfo.resetTime) {
    ipRequests.set(ip, { count: 1, resetTime: now + rateLimitWindowMs });
    return next();
  }

  if (requestInfo.count >= maxRequestsPerWindow) {
    console.warn(`⚠️ [SECURITY] Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: 'TooManyRequests',
      category: 'network',
      message: 'To protect our service from spam, please wait 15 minutes before submitting another lead.'
    });
  }

  requestInfo.count++;
  next();
}
