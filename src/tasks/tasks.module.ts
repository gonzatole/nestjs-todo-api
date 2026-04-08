import { Module } from '@nestjs/common';
import { TasksCacheService } from './tasks-cache.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TasksCacheService],
})
export class TasksModule {}
