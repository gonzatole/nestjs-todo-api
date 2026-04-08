import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginatedTasksDto } from './dto/paginated-tasks.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksCacheService } from './tasks-cache.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: TasksCacheService,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        userId,
      },
    });

    await this.cache.invalidateUserCache(userId);
    return task;
  }

  async findAll(userId: string, filter: TaskFilterDto): Promise<PaginatedTasksDto> {
    const cached = await this.cache.get(userId, filter);
    if (cached) return cached;

    const { status, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const where = { userId, ...(status ? { status } : {}) };

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    const result: PaginatedTasksDto = {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cache.set(userId, filter, result);
    return result;
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findTaskOrThrow(taskId);
    this.assertOwnership(task, userId);

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.cache.invalidateUserCache(userId);
    return updated;
  }

  async remove(userId: string, taskId: string): Promise<void> {
    const task = await this.findTaskOrThrow(taskId);
    this.assertOwnership(task, userId);

    await this.prisma.task.delete({ where: { id: taskId } });
    await this.cache.invalidateUserCache(userId);
  }

  private async findTaskOrThrow(taskId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id "${taskId}" not found`);
    }
    return task;
  }

  private assertOwnership(task: Task, userId: string): void {
    if (task.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this task');
    }
  }
}
