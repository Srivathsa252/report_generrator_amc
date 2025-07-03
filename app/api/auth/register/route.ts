import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { hashPassword, generateToken } from '@/lib/auth';
import { validateRequest, createUserSchema } from '@/lib/validation';
import { createAuditLog } from '@/lib/database-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(createUserSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { email, name, password, role } = validation.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
    });
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    // Create audit log
    await createAuditLog(
      'users',
      user.id,
      'CREATE',
      null,
      { email: user.email, name: user.name, role: user.role },
      user.id
    );
    
    return successResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, 'User registered successfully', 201);
    
  } catch (error) {
    return handleApiError(error);
  }
}