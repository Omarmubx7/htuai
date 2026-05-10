import { prisma } from './prisma';
import { createAdminLog } from './database';

interface AIUsageLogData {
  userId?: number | null;
  endpoint: string;
  featureName?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  modelUsed?: string;
  status?: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  responseTimeMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AIUsageUserSummary {
  userId: number | null;
  studentId?: string | null;
  email?: string | null;
  usedToday: number;
  remainingToday: number;
  limit: number;
}

export interface AIUsageStatsSummary {
  totalCalls: number;
  callsByEndpoint: Array<{ endpoint: string; count: number }>;
  callsByModel: Array<{ model: string; count: number }>;
  callsByStatus: Array<{ status: string | null; count: number }>;
  totalTokens: { input: number; output: number; total: number };
  avgResponseTimeMs: number;
  recentLogs: Array<{
    id: number;
    endpoint: string;
    featureName?: string;
    studentId?: string;
    email?: string;
    status: string;
    totalTokens?: number;
    responseTimeMs?: number;
    createdAt: string | Date;
  }>;
  userUsage: AIUsageUserSummary[];
}

const DEFAULT_DAILY_AI_LIMIT = 2;

/**
 * Log AI usage to the database
 */
export async function logAIUsage(data: AIUsageLogData): Promise<void> {
  try {
    console.log('[AI Logger] Logging usage:', {
      endpoint: data.endpoint,
      userId: data.userId,
      tokens: { input: data.inputTokens, output: data.outputTokens, total: data.totalTokens },
      status: data.status,
    });

    const result = await prisma.aIUsageLog.create({
      data: {
        user_id: data.userId,
        endpoint: data.endpoint,
        feature_name: data.featureName,
        input_tokens: data.inputTokens,
        output_tokens: data.outputTokens,
        total_tokens: data.totalTokens,
        model_used: data.modelUsed,
        status: data.status || 'success',
        error_message: data.errorMessage,
        response_time_ms: data.responseTimeMs,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata, (key, value) => value === undefined ? null : value)) : {},
      },
    });

    console.log('[AI Logger] Successfully logged entry with ID:', result.id);

    createAdminLog({
      type: 'ai_usage',
      message: `AI ${data.featureName || data.endpoint} called by user ${data.userId} (${data.status || 'success'})`,
      details: { user_id: data.userId, endpoint: data.endpoint, feature: data.featureName, model: data.modelUsed, tokens: data.totalTokens, status: data.status, response_time_ms: data.responseTimeMs },
      event_kind: 'ai_usage',
      target_id: String(data.userId || ''),
    }).catch(() => {});
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[AI Logger] FAILED to log AI usage:', {
      endpoint: data.endpoint,
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Get AI usage statistics for admin dashboard
 */
export async function getAIUsageStats(days: number = 7): Promise<AIUsageStatsSummary> {
  const emptyStats = {
    totalCalls: 0,
    callsByEndpoint: [],
    callsByModel: [],
    callsByStatus: [],
    totalTokens: { input: 0, output: 0, total: 0 },
    avgResponseTimeMs: 0,
    recentLogs: [],
    userUsage: [],
  };

  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalCalls,
      callsByEndpoint,
      callsByModel,
      callsByStatus,
      totalTokens,
      avgResponseTime,
      recentLogs,
      todayLogs,
    ] = await Promise.all([
      prisma.aIUsageLog.count({
        where: { created_at: { gte: cutoffDate } },
      }),
      prisma.aIUsageLog.groupBy({
        by: ['endpoint'],
        where: { created_at: { gte: cutoffDate } },
        _count: true,
        orderBy: { _count: { endpoint: 'desc' } },
      }),
      prisma.aIUsageLog.groupBy({
        by: ['model_used'],
        where: { created_at: { gte: cutoffDate } },
        _count: true,
        orderBy: { _count: { model_used: 'desc' } },
      }),
      prisma.aIUsageLog.groupBy({
        by: ['status'],
        where: { created_at: { gte: cutoffDate } },
        _count: true,
      }),
      prisma.aIUsageLog.aggregate({
        where: { created_at: { gte: cutoffDate } },
        _sum: {
          total_tokens: true,
          input_tokens: true,
          output_tokens: true,
        },
      }),
      prisma.aIUsageLog.aggregate({
        where: {
          created_at: { gte: cutoffDate },
          response_time_ms: { not: null },
        },
        _avg: { response_time_ms: true },
      }),
      prisma.aIUsageLog.findMany({
        where: { created_at: { gte: cutoffDate } },
        orderBy: { created_at: 'desc' },
        take: 50,
        include: { user: { select: { student_id: true, email: true } } },
      }),
      prisma.aIUsageLog.findMany({
        where: { created_at: { gte: todayStart } },
        select: { user_id: true, user: { select: { student_id: true, email: true } } },
      }),
    ]);

    const userUsageMap = new Map<number | null, AIUsageUserSummary>();
    for (const log of todayLogs) {
      const userId = log.user_id ?? null;
      const existing = userUsageMap.get(userId);
      if (existing) {
        existing.usedToday += 1;
        existing.remainingToday = Math.max(existing.limit - existing.usedToday, 0);
        continue;
      }

      userUsageMap.set(userId, {
        userId,
        studentId: log.user?.student_id ?? null,
        email: log.user?.email ?? null,
        usedToday: 1,
        remainingToday: DEFAULT_DAILY_AI_LIMIT - 1,
        limit: DEFAULT_DAILY_AI_LIMIT,
      });
    }

    const getCount = (item: { _count: unknown }) => {
      const c = item._count;
      return typeof c === 'number' ? c : (c as Record<string, number>)?._all ?? (c as number) ?? 0;
    };

    return {
      totalCalls,
      callsByEndpoint: callsByEndpoint.map(item => ({
        endpoint: item.endpoint,
        count: getCount(item),
      })),
      callsByModel: callsByModel.map(item => ({
        model: item.model_used || 'unknown',
        count: getCount(item),
      })),
      callsByStatus: callsByStatus.map(item => ({
        status: item.status,
        count: getCount(item),
      })),
      totalTokens: {
        input: totalTokens._sum.input_tokens || 0,
        output: totalTokens._sum.output_tokens || 0,
        total: totalTokens._sum.total_tokens || 0,
      },
      avgResponseTimeMs: avgResponseTime._avg.response_time_ms || 0,
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        endpoint: log.endpoint,
        featureName: log.feature_name,
        studentId: log.user?.student_id,
        email: log.user?.email,
        status: log.status,
        totalTokens: log.total_tokens,
        responseTimeMs: log.response_time_ms,
        createdAt: log.created_at,
      })),
      userUsage: Array.from(userUsageMap.values()).sort((a, b) => b.usedToday - a.usedToday),
    };
  } catch (error) {
    console.error('Failed to get AI usage stats:', error);
    return emptyStats;
  }
}

/**
 * Get AI usage stats by endpoint
 */
export async function getEndpointStats(endpoint: string, days: number = 7) {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await prisma.aIUsageLog.aggregate({
      where: {
        endpoint,
        created_at: { gte: cutoffDate },
      },
      _count: true,
      _sum: {
        total_tokens: true,
        input_tokens: true,
        output_tokens: true,
        response_time_ms: true,
      },
      _avg: { response_time_ms: true },
    });

    const errorCount = await prisma.aIUsageLog.count({
      where: {
        endpoint,
        created_at: { gte: cutoffDate },
        status: { not: 'success' },
      },
    });

    return {
      endpoint,
      totalCalls: stats._count,
      successRate: stats._count > 0 ? Math.round(((stats._count - errorCount) / stats._count) * 100) : 0,
      totalTokens: stats._sum.total_tokens || 0,
      inputTokens: stats._sum.input_tokens || 0,
      outputTokens: stats._sum.output_tokens || 0,
      avgResponseTimeMs: Math.round(stats._avg.response_time_ms || 0),
      errorCount,
    };
  } catch (error) {
    console.error('Failed to get endpoint stats:', error);
    return null;
  }
}
