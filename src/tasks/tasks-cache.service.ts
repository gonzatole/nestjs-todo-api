import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PaginatedTasksDto } from './dto/paginated-tasks.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

@Injectable()
export class TasksCacheService {
  private readonly logger = new Logger(TasksCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  buildKey(userId: string, filter: TaskFilterDto): string {
    const { status, page = 1, limit = 10 } = filter;
    const statusPart = status ? `:status:${status}` : '';
    return `tasks:user:${userId}${statusPart}:page:${page}:limit:${limit}`;
  }

  async get(userId: string, filter: TaskFilterDto): Promise<PaginatedTasksDto | null> {
    const key = this.buildKey(userId, filter);
    const cached = await this.cacheManager.get<PaginatedTasksDto>(key);
    if (cached) {
      this.logger.debug(`Cache HIT → ${key}`);
    }
    return cached ?? null;
  }

  async set(userId: string, filter: TaskFilterDto, value: PaginatedTasksDto): Promise<void> {
    const key = this.buildKey(userId, filter);
    await this.cacheManager.set(key, value);
    this.logger.debug(`Cache SET → ${key}`);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    const store = this.cacheManager.store as { keys?: (pattern: string) => Promise<string[]> };

    if (typeof store.keys === 'function') {
      const pattern = `tasks:user:${userId}*`;
      const keys = await store.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => this.cacheManager.del(k)));
        this.logger.debug(`Cache INVALIDATED → ${keys.length} keys for user ${userId}`);
      }
    } else {
      this.logger.warn('Redis store does not support pattern-based key deletion');
    }
  }
}
