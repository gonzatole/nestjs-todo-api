import { ApiProperty } from '@nestjs/swagger';
import { Task } from '@prisma/client';

export class PaginatedTasksDto {
  @ApiProperty({ isArray: true })
  data: Task[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
