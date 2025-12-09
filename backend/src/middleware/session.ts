/**
 * Session Middleware
 * Cookie-based session tracking (no authentication)
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const SESSION_COOKIE_NAME = 'neo_session';

export interface SessionRequest extends Request {
  sessionId: string;
}

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  let sessionId = req.cookies[SESSION_COOKIE_NAME];

  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  (req as SessionRequest).sessionId = sessionId;
  next();
}
