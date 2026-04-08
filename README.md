# NestJS To-Do API

A production-ready REST API for task management, built with **NestJS**, **PostgreSQL** (Prisma ORM), and **Redis** caching.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 + TypeScript |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache | Redis 7 (cache-manager-redis-yet) |
| Auth | JWT (passport-jwt) |
| Validation | class-validator + class-transformer |
| Docs | Swagger / OpenAPI |
| Tests | Jest |

## Features

- JWT authentication (register + login)
- Full CRUD for tasks with ownership enforcement
- Redis cache for `GET /tasks` with automatic invalidation on mutations
- Pagination and optional status filtering
- Structured logging interceptor (method / path / status / duration)
- Consistent error responses via global exception filter
- Swagger UI at `/api`
- Unit tests for `TasksService`
- Docker Compose for local infrastructure

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) + Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/gonzatole/nestjs-todo-api.git
cd nestjs-todo-api
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET`. The defaults work for local development.

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on port `5432` and Redis on port `6379`.

### 4. Install dependencies

```bash
npm install
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Start the development server

```bash
npm run start:dev
```

The API is now available at `http://localhost:3000`.  
Swagger UI is available at `http://localhost:3000/api`.

---

## API Reference

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user, returns JWT |
| POST | `/auth/login` | Login, returns JWT |

### Tasks (requires `Authorization: Bearer <token>`)

| Method | Path | Description |
|---|---|---|
| POST | `/tasks` | Create a new task |
| GET | `/tasks` | List tasks (filter by status, paginate) |
| PATCH | `/tasks/:id` | Update a task (owner only) |
| DELETE | `/tasks/:id` | Delete a task (owner only) |

#### Query parameters for `GET /tasks`

| Parameter | Type | Description |
|---|---|---|
| `status` | `pending` \| `in_progress` \| `done` | Filter by status |
| `page` | number (default: 1) | Page number |
| `limit` | number (default: 10, max: 100) | Items per page |

---

## Example Usage

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}' | jq -r '.accessToken')

# Create task
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My first task","description":"Learn NestJS"}'

# List tasks
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"

# Filter by status + pagination
curl "http://localhost:3000/tasks?status=pending&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:cov
```

---

## Project Structure

```
src/
├── auth/                  # Authentication module (JWT)
│   ├── decorators/        # @CurrentUser() param decorator
│   ├── dto/               # RegisterDto, LoginDto, AuthResponseDto
│   ├── guards/            # JwtAuthGuard
│   └── strategies/        # JwtStrategy
├── common/
│   ├── filters/           # Global HttpExceptionFilter
│   └── interceptors/      # LoggingInterceptor
├── prisma/                # PrismaService + PrismaModule (global)
└── tasks/                 # Tasks module
    ├── dto/               # CreateTaskDto, UpdateTaskDto, TaskFilterDto, PaginatedTasksDto
    ├── enums/             # TaskStatus enum
    ├── tasks-cache.service.ts   # Redis cache logic
    ├── tasks.service.ts         # Business logic
    └── tasks.controller.ts      # HTTP handlers
```

---

## Cache Strategy

- **Read** (`GET /tasks`): checks Redis first; on miss, queries DB and stores the result.
- **Key format**: `tasks:user:{userId}[:status:{status}]:page:{page}:limit:{limit}`
- **Invalidation**: on every `POST`, `PATCH`, or `DELETE`, all keys matching `tasks:user:{userId}*` are deleted from Redis.
- **TTL**: 5 minutes (configurable via `REDIS_TTL` env var in seconds).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_TTL` | `300` | Cache TTL in seconds |
| `JWT_SECRET` | — | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | JWT expiration |
