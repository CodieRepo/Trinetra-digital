import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  category?: 'network' | 'database' | 'ai_service' | 'whatsapp_gateway' | 'generic';
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const category = err.category || 'generic';

  // Mask sensitive data in error message if any
  let message = err.message || 'An unexpected error occurred';
  
  // Categorize errors if database related (SQLite errors often contain specific keywords)
  let detectedCategory = category;
  if (message.toLowerCase().includes('sqlite') || message.toLowerCase().includes('database') || message.toLowerCase().includes('sql')) {
    detectedCategory = 'database';
  } else if (message.toLowerCase().includes('gemini') || message.toLowerCase().includes('generativeai') || message.toLowerCase().includes('ai')) {
    detectedCategory = 'ai_service';
  } else if (message.toLowerCase().includes('baileys') || message.toLowerCase().includes('whatsapp') || message.toLowerCase().includes('sock')) {
    detectedCategory = 'whatsapp_gateway';
  }

  // Redact potentially sensitive parameters in standard logging
  const maskedUrl = req.originalUrl.replace(/token=[^&]+/g, 'token=***');

  console.error(`🔥 [ERROR] [Category: ${detectedCategory}] [Status: ${statusCode}] [Path: ${req.method} ${maskedUrl}]`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  return res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    category: detectedCategory,
    message: message,
    timestamp: new Date().toISOString()
  });
}
