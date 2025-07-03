import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

// Generic function for safe database operations with error handling
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors
      switch (error.code) {
        case 'P2002':
          return { success: false, error: 'A record with this information already exists' };
        case 'P2025':
          return { success: false, error: 'Record not found' };
        case 'P2003':
          return { success: false, error: 'Foreign key constraint failed' };
        case 'P2016':
          return { success: false, error: 'Query interpretation error' };
        default:
          return { success: false, error: `Database error: ${error.message}` };
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

// Transaction wrapper for multiple operations
export async function withTransaction<T>(
  operations: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  return safeDbOperation(
    () => prisma.$transaction(operations),
    'Transaction failed'
  );
}

// Pagination helper
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function paginate<T>(
  model: any,
  options: PaginationOptions & { where?: any; include?: any } = {}
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where: options.where,
      include: options.include,
      orderBy: options.orderBy || { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    model.count({ where: options.where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Soft delete helper
export async function softDelete(model: any, id: string) {
  return safeDbOperation(
    () => model.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    }),
    'Failed to delete record'
  );
}

// Restore soft deleted record
export async function restoreRecord(model: any, id: string) {
  return safeDbOperation(
    () => model.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    }),
    'Failed to restore record'
  );
}

// Audit logging helper
export async function createAuditLog(
  tableName: string,
  recordId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT',
  oldValues?: any,
  newValues?: any,
  userId?: string,
  metadata?: { ipAddress?: string; userAgent?: string }
) {
  return safeDbOperation(
    () => prisma.auditLog.create({
      data: {
        tableName,
        recordId,
        action,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        userId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    }),
    'Failed to create audit log'
  );
}

// Database health check with detailed information
export async function getDatabaseStats() {
  try {
    const [
      committeesCount,
      checkpostsCount,
      receiptsCount,
      targetsCount,
      usersCount,
      auditLogsCount,
    ] = await Promise.all([
      prisma.committee.count({ where: { isActive: true } }),
      prisma.checkpost.count({ where: { isActive: true } }),
      prisma.receipt.count({ where: { isActive: true } }),
      prisma.target.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.auditLog.count(),
    ]);

    return {
      committees: committeesCount,
      checkposts: checkpostsCount,
      receipts: receiptsCount,
      targets: targetsCount,
      users: usersCount,
      auditLogs: auditLogsCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
}

// Backup data export helper
export async function exportData() {
  return safeDbOperation(async () => {
    const [committees, checkposts, receipts, targets, users] = await Promise.all([
      prisma.committee.findMany({ include: { checkposts: true } }),
      prisma.checkpost.findMany(),
      prisma.receipt.findMany(),
      prisma.target.findMany({ 
        include: { 
          monthlyTargets: true, 
          checkpostTargets: true 
        } 
      }),
      prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } }),
    ]);

    return {
      committees,
      checkposts,
      receipts,
      targets,
      users,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }, 'Failed to export data');
}