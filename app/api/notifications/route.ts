import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

export const GET = requireAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Get recent activities and alerts
    const [
      recentReceipts,
      lowPerformingCommittees,
      recentTargetUpdates,
      systemAlerts,
    ] = await Promise.all([
      getRecentReceipts(limit),
      getLowPerformingCommittees(),
      getRecentTargetUpdates(limit),
      getSystemAlerts(),
    ]);
    
    const notifications = [
      ...recentReceipts,
      ...lowPerformingCommittees,
      ...recentTargetUpdates,
      ...systemAlerts,
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, limit);
    
    return successResponse({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      generatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    return handleApiError(error);
  }
});

async function getRecentReceipts(limit: number) {
  const receipts = await prisma.receipt.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    include: {
      committee: {
        select: { name: true, code: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  return receipts.map(receipt => ({
    id: `receipt-${receipt.id}`,
    type: 'receipt',
    title: 'New Receipt Added',
    message: `Receipt ${receipt.receiptNumber} for ₹${Number(receipt.marketFee).toLocaleString()} added to ${receipt.committee?.name}`,
    timestamp: receipt.createdAt.toISOString(),
    read: false,
    priority: 'low',
    data: { receiptId: receipt.id },
  }));
}

async function getLowPerformingCommittees() {
  // Get committees with less than 50% achievement
  const committees = await prisma.committee.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      receipts: {
        where: {
          isActive: true,
          deletedAt: null,
          financialYear: '2025-26',
          natureOfReceipt: 'MF',
        },
      },
      targets: {
        where: {
          isActive: true,
          deletedAt: null,
          financialYear: '2025-26',
        },
      },
    },
  });
  
  const lowPerforming = committees.filter(committee => {
    const totalCollection = committee.receipts.reduce((sum, r) => sum + Number(r.marketFee), 0);
    const yearlyTarget = committee.targets[0] ? Number(committee.targets[0].yearlyTarget) : 0;
    const achievement = yearlyTarget > 0 ? (totalCollection / yearlyTarget) * 100 : 0;
    return achievement < 50 && yearlyTarget > 0;
  });
  
  return lowPerforming.map(committee => ({
    id: `low-performance-${committee.id}`,
    type: 'alert',
    title: 'Low Performance Alert',
    message: `${committee.name} is performing below 50% of target`,
    timestamp: new Date().toISOString(),
    read: false,
    priority: 'high',
    data: { committeeId: committee.id },
  }));
}

async function getRecentTargetUpdates(limit: number) {
  const targets = await prisma.target.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      updatedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: {
      committee: {
        select: { name: true, code: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  
  return targets.map(target => ({
    id: `target-${target.id}`,
    type: 'target',
    title: 'Target Updated',
    message: `Target for ${target.committee?.name} (${target.financialYear}) updated to ₹${Number(target.yearlyTarget).toLocaleString()}`,
    timestamp: target.updatedAt.toISOString(),
    read: false,
    priority: 'medium',
    data: { targetId: target.id },
  }));
}

async function getSystemAlerts() {
  const alerts = [];
  
  // Check for database health
  try {
    const receiptCount = await prisma.receipt.count();
    if (receiptCount === 0) {
      alerts.push({
        id: 'no-receipts',
        type: 'system',
        title: 'No Receipts Found',
        message: 'No receipts have been entered in the system',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'medium',
        data: {},
      });
    }
  } catch (error) {
    alerts.push({
      id: 'db-error',
      type: 'system',
      title: 'Database Error',
      message: 'Unable to connect to database',
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'high',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
  }
  
  return alerts;
}