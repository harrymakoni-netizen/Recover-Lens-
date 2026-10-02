import type { AuthUser } from '@workspace/api-zod';
import { type NextFunction, type Request, type Response } from 'express';
import * as oidc from 'openid-client';
import { db, usersTable } from '@workspace/db';

import {
  clearSession,
  getOidcConfig,
  getSession,
  getSessionId,
  updateSession,
  type SessionData,
} from '../lib/auth';

export const DEMO_USER_ID = 'recoverlens-demo';
const DEMO_USER: AuthUser = {
  id: DEMO_USER_ID,
  email: 'demo@recoverlens.local',
  firstName: 'Demo',
  lastName: 'User',
  profileImageUrl: null,
  role: 'patient',
  roles: ['patient', 'caregiver', 'clinician', 'coach'],
  patientIds: ['patient-1'],
  patientAccess: [
    { patientId: 'patient-1', role: 'patient' },
    { patientId: 'patient-1', role: 'caregiver' },
    { patientId: 'patient-1', role: 'clinician' },
    { patientId: 'patient-1', role: 'coach' },
  ],
};
let demoUserReady: Promise<unknown> | null = null;

function useDemoUser(req: Request) {
  req.user = DEMO_USER;
  demoUserReady ??= db.insert(usersTable).values({
    id: DEMO_USER_ID,
    email: DEMO_USER.email,
    firstName: DEMO_USER.firstName,
    lastName: DEMO_USER.lastName,
  }).onConflictDoNothing();
  return demoUserReady;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(config, session.refresh_token);
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request['isAuthenticated'];

  const sid = getSessionId(req);
  if (!sid) {
    await useDemoUser(req);
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    await useDemoUser(req);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    await useDemoUser(req);
    next();
    return;
  }

  req.user = refreshed.user;
  next();
}
