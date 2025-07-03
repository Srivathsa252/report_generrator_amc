import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { getDatabaseStats } from '@/lib/database-utils';
import { prisma } from '@/lib/prisma';

export const GET = requireAuth(async (request: NextRequest, auth) => {
  try {
    const [
      dbStats,
      recentActivity,
      systemHealth,
    ] = await Promise.all([
      getDatabaseStats(),
      getRecentActivity(),
      getSystemHealth(),
    ]);
    
    return successResponse({
      database: dbStats,
      recentActivity,
      system: systemHealth,
      generatedAt: new Date().toISOString(),
      generatedBy: auth.userId,
    });
    
  } catch (error) {
    return handleApiError(error);
  }
});

async function getRecentActivity() {
  const [recentReceipts, recentTargets, recentAuditLogs] = await Promise.all([
    prisma.receipt.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    }),
    prisma.target.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);
  
  return {
    last24Hours: {
      receipts: recentReceipts,
      targets: recentTargets,
      auditLogs: recentAuditLogs,
    },
  };
}

async function getSystemHealth() {
  const memoryUsage = process.memoryUsage();
  
  return {
    uptime: process.uptime(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}