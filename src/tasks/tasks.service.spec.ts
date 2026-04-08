import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Task, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TasksCacheService } from './tasks-cache.service';
import { TasksService } from './tasks.service';

const mockUserId = 'user-uuid-1';
const mockTaskId = 'task-uuid-1';

const mockTask: Task = {
  id: mockTaskId,
  title: 'Test Task',
  description: 'Test Description',
  status: TaskStatus.pending,
  userId: mockUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrismaService = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  invalidateUserCache: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TasksCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task and invalidate cache', async () => {
      const dto: CreateTaskDto = { title: 'New Task', description: 'A description' };
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockCacheService.invalidateUserCache.mockResolvedValue(undefined);

      const result = await service.create(mockUserId, dto);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          description: dto.description,
          status: undefined,
          userId: mockUserId,
        },
      });
      expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockTask);
    });
  });

  describe('findAll', () => {
    const filter: TaskFilterDto = { page: 1, limit: 10 };

    it('should return cached result if available', async () => {
      const cachedResult = { data: [mockTask], total: 1, page: 1, limit: 10, totalPages: 1 };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.findAll(mockUserId, filter);

      expect(mockCacheService.get).toHaveBeenCalledWith(mockUserId, filter);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should query DB on cache miss and populate cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.$transaction.mockResolvedValue([[mockTask], 1]);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.findAll(mockUserId, filter);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(mockUserId, filter, {
        data: [mockTask],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(result.data).toEqual([mockTask]);
      expect(result.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update a task owned by the user', async () => {
      const dto = { title: 'Updated Title' };
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);
      mockCacheService.invalidateUserCache.mockResolvedValue(undefined);

      const result = await service.update(mockUserId, mockTaskId, dto);

      expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith(mockUserId);
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.update(mockUserId, 'non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        ...mockTask,
        userId: 'another-user',
      });

      await expect(service.update(mockUserId, mockTaskId, {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a task owned by the user', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.delete.mockResolvedValue(mockTask);
      mockCacheService.invalidateUserCache.mockResolvedValue(undefined);

      await service.remove(mockUserId, mockTaskId);

      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({ where: { id: mockTaskId } });
      expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        ...mockTask,
        userId: 'another-user',
      });

      await expect(service.remove(mockUserId, mockTaskId)).rejects.toThrow(ForbiddenException);
    });
  });
});
