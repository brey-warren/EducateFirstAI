/**
 * Response caching service for EducateFirstAI
 * Implements intelligent caching for common FAFSA queries to minimize API calls
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export class CachingService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static stats = {
    hits: 0,
    misses: 0,
  };

  // Cache configuration
  private static readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_CACHE_SIZE = 1000; // Maximum number of entries
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Common FAFSA queries that should be cached longer
  private static readonly COMMON_QUERIES = [
    'what is fafsa',
    'fafsa requirements',
    'fafsa deadlines',
    'dependency status',
    'federal student aid',
    'pell grant',
    'student loans',
    'fafsa documents needed',
    'how to fill out fafsa',
    'fafsa eligibility',
  ];

  static {
    // Start periodic cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    }
  }

  /**
   * Generate cache key from query parameters
   */
  private static generateKey(query: string, userId?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    return userId ? `${userId}:${normalizedQuery}` : `global:${normalizedQuery}`;
  }

  /**
   * Check if query is a common FAFSA question
   */
  private static isCommonQuery(query: string): boolean {
    const normalizedQuery = query.toLowerCase();
    return this.COMMON_QUERIES.some(commonQuery => 
      normalizedQuery.includes(commonQuery) || 
      commonQuery.includes(normalizedQuery)
    );
  }

  /**
   * Get TTL based on query type
   */
  private static getTTL(query: string): number {
    if (this.isCommonQuery(query)) {
      return 2 * 60 * 60 * 1000; // 2 hours for common queries
    }
    return this.DEFAULT_TTL; // 30 minutes for other queries
  }

  /**
   * Store data in cache
   */
  static set<T>(query: string, data: T, userId?: string, customTTL?: number): void {
    const key = this.generateKey(query, userId);
    const ttl = customTTL || this.getTTL(query);
    const now = Date.now();

    // Check cache size and cleanup if necessary
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Retrieve data from cache
   */
  static get<T>(query: string, userId?: string): T | null {
    const key = this.generateKey(query, userId);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Check if data exists in cache and is valid
   */
  static has(query: string, userId?: string): boolean {
    const key = this.generateKey(query, userId);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove specific entry from cache
   */
  static delete(query: string, userId?: string): boolean {
    const key = this.generateKey(query, userId);
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private static evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
    };
  }

  /**
   * Estimate memory usage of cache
   */
  private static estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON string size of data + metadata
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // Estimated metadata size
    }
    
    return totalSize;
  }

  /**
   * Preload common FAFSA responses
   */
  static preloadCommonResponses(): void {
    const commonResponses = [
      {
        query: 'what is fafsa',
        response: 'The FAFSA (Free Application for Federal Student Aid) is a form that students fill out to apply for federal financial aid for college. It helps determine your eligibility for grants, loans, and work-study programs.',
      },
      {
        query: 'fafsa requirements',
        response: 'To complete the FAFSA, you need your Social Security number, tax returns, bank statements, investment records, and records of untaxed income. You must be a U.S. citizen or eligible non-citizen.',
      },
      {
        query: 'dependency status',
        response: 'Your dependency status determines whose financial information you need to provide on the FAFSA. If you\'re under 24, unmarried, and don\'t meet other independence criteria, you\'re considered dependent.',
      },
      {
        query: 'fafsa deadlines',
        response: 'The federal FAFSA deadline is June 30th, but many states and schools have earlier deadlines. Submit your FAFSA as early as possible after October 1st for the best aid opportunities.',
      },
      {
        query: 'pell grant',
        response: 'Pell Grants are federal grants that don\'t need to be repaid. The maximum award for 2023-24 is $7,395. Eligibility is based on financial need, cost of attendance, and enrollment status.',
      },
    ];

    commonResponses.forEach(({ query, response }) => {
      this.set(query, {
        message: {
          id: `cached_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: response,
          sender: 'ai',
          timestamp: new Date(),
          metadata: {
            sources: ['https://studentaid.gov/apply-for-aid/fafsa'],
            cached: true,
          },
        },
        sources: ['https://studentaid.gov/apply-for-aid/fafsa'],
      }, undefined, 4 * 60 * 60 * 1000); // 4 hours for preloaded responses
    });
  }

  /**
   * Get cache performance metrics for monitoring
   */
  static getPerformanceMetrics(): {
    hitRate: number;
    averageResponseTime: number;
    cacheEfficiency: number;
    memoryUsage: number;
  } {
    const stats = this.getStats();
    const totalRequests = stats.totalHits + stats.totalMisses;
    
    return {
      hitRate: stats.hitRate,
      averageResponseTime: stats.totalHits > 0 ? 5 : 500, // Cached responses are much faster
      cacheEfficiency: totalRequests > 0 ? (stats.totalHits / totalRequests) * 100 : 0,
      memoryUsage: stats.memoryUsage,
    };
  }
}