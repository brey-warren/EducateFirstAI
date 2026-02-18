/**
 * Performance monitoring service for EducateFirstAI
 * Tracks performance metrics and AWS usage for free tier compliance
 */

export interface PerformanceMetrics {
  responseTime: number;
  timestamp: number;
  operation: string;
  success: boolean;
  cacheHit?: boolean;
  errorType?: string;
}

export interface AWSUsageMetrics {
  lambdaInvocations: number;
  dynamodbReads: number;
  dynamodbWrites: number;
  bedrockTokens: number;
  s3Requests: number;
  estimatedCost: number;
  lastUpdated: number;
}

export interface PerformanceReport {
  averageResponseTime: number;
  successRate: number;
  cacheHitRate: number;
  slowestOperations: Array<{ operation: string; averageTime: number }>;
  errorRate: number;
  commonErrors: Array<{ error: string; count: number }>;
  awsUsage: AWSUsageMetrics;
  recommendations: string[];
}

export class PerformanceMonitoringService {
  private static metrics: PerformanceMetrics[] = [];
  private static awsUsage: AWSUsageMetrics = {
    lambdaInvocations: 0,
    dynamodbReads: 0,
    dynamodbWrites: 0,
    bedrockTokens: 0,
    s3Requests: 0,
    estimatedCost: 0,
    lastUpdated: Date.now(),
  };

  // Free tier limits (monthly)
  private static readonly FREE_TIER_LIMITS = {
    lambdaInvocations: 1000000, // 1M requests
    lambdaComputeTime: 400000, // 400,000 GB-seconds
    dynamodbReads: 25, // 25 GB storage + 25 RCU
    dynamodbWrites: 25, // 25 WCU
    s3Requests: 20000, // 20,000 GET requests
    s3Storage: 5, // 5 GB storage
  };

  // Cost estimates (USD per unit)
  private static readonly COST_ESTIMATES = {
    lambdaInvocation: 0.0000002, // $0.20 per 1M requests
    dynamodbRead: 0.000000125, // $0.25 per 1M RCU
    dynamodbWrite: 0.000000625, // $1.25 per 1M WCU
    bedrockToken: 0.00001, // Estimated $0.01 per 1K tokens
    s3Request: 0.0000004, // $0.40 per 1M requests
  };

  /**
   * Record a performance metric
   */
  static recordMetric(
    operation: string,
    responseTime: number,
    success: boolean,
    cacheHit?: boolean,
    errorType?: string
  ): void {
    const metric: PerformanceMetrics = {
      operation,
      responseTime,
      timestamp: Date.now(),
      success,
      cacheHit,
      errorType,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Update AWS usage estimates
    this.updateAWSUsage(operation, success);
  }

  /**
   * Update AWS usage estimates based on operation
   */
  private static updateAWSUsage(operation: string, success: boolean): void {
    const now = Date.now();
    
    switch (operation) {
      case 'send_message':
        this.awsUsage.lambdaInvocations += 1;
        this.awsUsage.dynamodbWrites += 1; // Store conversation
        if (success) {
          this.awsUsage.bedrockTokens += 100; // Estimated tokens per response
        }
        break;
      
      case 'get_chat_history':
        this.awsUsage.lambdaInvocations += 1;
        this.awsUsage.dynamodbReads += 5; // Estimated reads for history
        break;
      
      case 'update_progress':
        this.awsUsage.lambdaInvocations += 1;
        this.awsUsage.dynamodbWrites += 1;
        this.awsUsage.dynamodbReads += 1;
        break;
      
      case 'authenticate':
        this.awsUsage.lambdaInvocations += 1;
        this.awsUsage.dynamodbReads += 1;
        break;
      
      case 'knowledge_search':
        this.awsUsage.lambdaInvocations += 1;
        this.awsUsage.s3Requests += 1;
        break;
    }

    // Update estimated cost
    this.awsUsage.estimatedCost = this.calculateEstimatedCost();
    this.awsUsage.lastUpdated = now;
  }

  /**
   * Calculate estimated AWS costs
   */
  private static calculateEstimatedCost(): number {
    let totalCost = 0;

    // Lambda costs (beyond free tier)
    const excessLambdaInvocations = Math.max(0, this.awsUsage.lambdaInvocations - this.FREE_TIER_LIMITS.lambdaInvocations);
    totalCost += excessLambdaInvocations * this.COST_ESTIMATES.lambdaInvocation;

    // DynamoDB costs (beyond free tier)
    const excessReads = Math.max(0, this.awsUsage.dynamodbReads - this.FREE_TIER_LIMITS.dynamodbReads);
    const excessWrites = Math.max(0, this.awsUsage.dynamodbWrites - this.FREE_TIER_LIMITS.dynamodbWrites);
    totalCost += excessReads * this.COST_ESTIMATES.dynamodbRead;
    totalCost += excessWrites * this.COST_ESTIMATES.dynamodbWrite;

    // Bedrock costs (no free tier)
    totalCost += this.awsUsage.bedrockTokens * this.COST_ESTIMATES.bedrockToken;

    // S3 costs (beyond free tier)
    const excessS3Requests = Math.max(0, this.awsUsage.s3Requests - this.FREE_TIER_LIMITS.s3Requests);
    totalCost += excessS3Requests * this.COST_ESTIMATES.s3Request;

    return totalCost;
  }

  /**
   * Get performance report
   */
  static getPerformanceReport(): PerformanceReport {
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 24 * 60 * 60 * 1000); // Last 24 hours
    
    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 100,
        cacheHitRate: 0,
        slowestOperations: [],
        errorRate: 0,
        commonErrors: [],
        awsUsage: this.awsUsage,
        recommendations: ['No recent activity to analyze'],
      };
    }

    // Calculate metrics
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const successRate = (successfulRequests / recentMetrics.length) * 100;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / recentMetrics.length) * 100;
    const errorRate = ((recentMetrics.length - successfulRequests) / recentMetrics.length) * 100;

    // Analyze slowest operations
    const operationTimes = new Map<string, number[]>();
    recentMetrics.forEach(m => {
      if (!operationTimes.has(m.operation)) {
        operationTimes.set(m.operation, []);
      }
      operationTimes.get(m.operation)!.push(m.responseTime);
    });

    const slowestOperations = Array.from(operationTimes.entries())
      .map(([operation, times]) => ({
        operation,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    // Analyze common errors
    const errorCounts = new Map<string, number>();
    recentMetrics.filter(m => !m.success && m.errorType).forEach(m => {
      const error = m.errorType!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations(averageResponseTime, successRate, cacheHitRate, errorRate);

    return {
      averageResponseTime,
      successRate,
      cacheHitRate,
      slowestOperations,
      errorRate,
      commonErrors,
      awsUsage: this.awsUsage,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations
   */
  private static generateRecommendations(
    avgResponseTime: number,
    successRate: number,
    cacheHitRate: number,
    errorRate: number
  ): string[] {
    const recommendations: string[] = [];

    if (avgResponseTime > 2000) {
      recommendations.push('Average response time is high. Consider implementing more aggressive caching.');
    }

    if (successRate < 95) {
      recommendations.push('Success rate is below 95%. Review error handling and retry logic.');
    }

    if (cacheHitRate < 30) {
      recommendations.push('Cache hit rate is low. Consider preloading common responses.');
    }

    if (errorRate > 5) {
      recommendations.push('Error rate is high. Review error patterns and improve error prevention.');
    }

    if (this.awsUsage.lambdaInvocations > this.FREE_TIER_LIMITS.lambdaInvocations * 0.8) {
      recommendations.push('Approaching Lambda free tier limit. Consider implementing more caching.');
    }

    if (this.awsUsage.bedrockTokens > 10000) {
      recommendations.push('High Bedrock token usage. Consider caching common responses to reduce costs.');
    }

    if (this.awsUsage.estimatedCost > 5) {
      recommendations.push('Estimated monthly cost exceeds $5. Review usage patterns and optimize.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Continue monitoring for optimization opportunities.');
    }

    return recommendations;
  }

  /**
   * Check if approaching free tier limits
   */
  static checkFreeTierStatus(): {
    withinLimits: boolean;
    warnings: string[];
    usage: Record<string, { current: number; limit: number; percentage: number }>;
  } {
    const warnings: string[] = [];
    const usage: Record<string, { current: number; limit: number; percentage: number }> = {};

    // Check Lambda invocations
    const lambdaPercentage = (this.awsUsage.lambdaInvocations / this.FREE_TIER_LIMITS.lambdaInvocations) * 100;
    usage.lambda = {
      current: this.awsUsage.lambdaInvocations,
      limit: this.FREE_TIER_LIMITS.lambdaInvocations,
      percentage: lambdaPercentage,
    };

    if (lambdaPercentage > 80) {
      warnings.push(`Lambda invocations at ${lambdaPercentage.toFixed(1)}% of free tier limit`);
    }

    // Check DynamoDB usage
    const dynamoReadPercentage = (this.awsUsage.dynamodbReads / this.FREE_TIER_LIMITS.dynamodbReads) * 100;
    const dynamoWritePercentage = (this.awsUsage.dynamodbWrites / this.FREE_TIER_LIMITS.dynamodbWrites) * 100;
    
    usage.dynamoReads = {
      current: this.awsUsage.dynamodbReads,
      limit: this.FREE_TIER_LIMITS.dynamodbReads,
      percentage: dynamoReadPercentage,
    };

    usage.dynamoWrites = {
      current: this.awsUsage.dynamodbWrites,
      limit: this.FREE_TIER_LIMITS.dynamodbWrites,
      percentage: dynamoWritePercentage,
    };

    if (dynamoReadPercentage > 80) {
      warnings.push(`DynamoDB reads at ${dynamoReadPercentage.toFixed(1)}% of free tier limit`);
    }

    if (dynamoWritePercentage > 80) {
      warnings.push(`DynamoDB writes at ${dynamoWritePercentage.toFixed(1)}% of free tier limit`);
    }

    return {
      withinLimits: warnings.length === 0,
      warnings,
      usage,
    };
  }

  /**
   * Reset metrics (useful for testing or monthly resets)
   */
  static resetMetrics(): void {
    this.metrics = [];
    this.awsUsage = {
      lambdaInvocations: 0,
      dynamodbReads: 0,
      dynamodbWrites: 0,
      bedrockTokens: 0,
      s3Requests: 0,
      estimatedCost: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Export metrics for external monitoring
   */
  static exportMetrics(): {
    performance: PerformanceMetrics[];
    awsUsage: AWSUsageMetrics;
    report: PerformanceReport;
  } {
    return {
      performance: [...this.metrics],
      awsUsage: { ...this.awsUsage },
      report: this.getPerformanceReport(),
    };
  }
}