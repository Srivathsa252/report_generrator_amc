import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  // Verify user still exists and is active
  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      isActive: true,
      deletedAt: null,
    },
  });
  
  if (!user) {
    return null;
  }
  
  return payload;
}

export function requireAuth(handler: (request: NextRequest, auth: JWTPayload) => Promise<Response>) {
  return async (request: NextRequest) => {
    const auth = await authenticateRequest(request);
    
    if (!auth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(request, auth);
  };
}

export function requireRole(roles: string[]) {
  return (handler: (request: NextRequest, auth: JWTPayload) => Promise<Response>) => {
    return requireAuth(async (request: NextRequest, auth: JWTPayload) => {
      if (!roles.includes(auth.role)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      return handler(request, auth);
    });
  };
}