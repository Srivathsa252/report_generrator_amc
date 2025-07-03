import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { verifyPassword, generateToken } from '@/lib/auth';
import { validateRequest, loginSchema } from '@/lib/validation';
import { createAuditLog } from '@/lib/database-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(loginSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { email, password } = validation.data;
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        deletedAt: null,
      },
    });
    
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      return errorResponse('Invalid credentials', 401);
    }
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    
    // Create audit log
    await createAuditLog(
      'users',
      user.id,
      'LOGIN',
      null,
      { email: user.email },
      user.id,
      {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    );
    
    return successResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, 'Login successful');
    
  } catch (error) {
    return handleApiError(error);
  }
}