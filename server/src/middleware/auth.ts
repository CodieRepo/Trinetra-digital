import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'trinetra_secret_super_secure_123!';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
      }

      req.user = user as AuthenticatedRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: Access token missing' });
  }
}
