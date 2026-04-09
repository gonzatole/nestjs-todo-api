# NestJS To-Do API

API REST lista para producción para gestión de tareas, construida con **NestJS**, **PostgreSQL** (Prisma ORM) y caché con **Redis**.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | NestJS 10 + TypeScript |
| Base de datos | PostgreSQL 16 (Prisma ORM) |
| Caché | Redis 7 (cache-manager-redis-yet) |
| Autenticación | JWT (passport-jwt) |
| Validación | class-validator + class-transformer |
| Documentación | Swagger / OpenAPI |
| Tests | Jest |

## Funcionalidades

- Autenticación con JWT (registro + login)
- CRUD completo de tareas con verificación de propiedad
- Caché Redis para `GET /tasks` con invalidación automática al mutar datos
- Paginación y filtro opcional por estado
- Interceptor de logging estructurado (método / ruta / estado / duración)
- Respuestas de error consistentes mediante filtro global de excepciones
- Swagger UI en `/api`
- Tests unitarios para `TasksService`
- Docker Compose para infraestructura local

---

## Inicio Rápido

### Requisitos Previos

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) + Docker Compose

### 1. Clonar el repositorio

```bash
git clone https://github.com/gonzatole/nestjs-todo-api.git
cd nestjs-todo-api
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y define un `JWT_SECRET` seguro. Los valores por defecto funcionan para desarrollo local.

### 3. Levantar la infraestructura

```bash
docker compose up -d
```

Esto inicia PostgreSQL en el puerto `5432` y Redis en el puerto `6379`.

### 4. Instalar dependencias

```bash
npm install
```

### 5. Ejecutar migraciones de base de datos

```bash
npx prisma migrate dev --name init
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run start:dev
```

La API estará disponible en `http://localhost:3000`.  
La documentación Swagger estará disponible en `http://localhost:3000/api`.

---

## Referencia de la API

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registrar un nuevo usuario, devuelve JWT |
| POST | `/auth/login` | Iniciar sesión, devuelve JWT |

### Tareas (requiere `Authorization: Bearer <token>`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/tasks` | Crear una nueva tarea |
| GET | `/tasks` | Listar tareas (filtrar por estado, paginar) |
| PATCH | `/tasks/:id` | Actualizar una tarea (solo el dueño) |
| DELETE | `/tasks/:id` | Eliminar una tarea (solo el dueño) |

#### Parámetros de consulta para `GET /tasks`

| Parámetro | Tipo | Descripción |
|---|---|---|
| `status` | `pending` \| `in_progress` \| `done` | Filtrar por estado |
| `page` | número (por defecto: 1) | Número de página |
| `limit` | número (por defecto: 10, máx: 100) | Elementos por página |

---

## Ejemplos de Uso

```bash
# Registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"secret123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"secret123"}' | jq -r '.accessToken')

# Crear tarea
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Mi primera tarea","description":"Aprender NestJS"}'

# Listar tareas
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"

# Filtrar por estado + paginación
curl "http://localhost:3000/tasks?status=pending&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Ejecutar Tests

```bash
# Tests unitarios
npm test

# Con cobertura
npm run test:cov
```

---

## Estructura del Proyecto

```
src/
├── auth/                  # Módulo de autenticación (JWT)
│   ├── decorators/        # Decorador de parámetro @CurrentUser()
│   ├── dto/               # RegisterDto, LoginDto, AuthResponseDto
│   ├── guards/            # JwtAuthGuard
│   └── strategies/        # JwtStrategy
├── common/
│   ├── filters/           # HttpExceptionFilter global
│   └── interceptors/      # LoggingInterceptor
├── prisma/                # PrismaService + PrismaModule (global)
└── tasks/                 # Módulo de tareas
    ├── dto/               # CreateTaskDto, UpdateTaskDto, TaskFilterDto, PaginatedTasksDto
    ├── enums/             # Enum TaskStatus
    ├── tasks-cache.service.ts   # Lógica de caché Redis
    ├── tasks.service.ts         # Lógica de negocio
    └── tasks.controller.ts      # Manejadores HTTP
```

---

## Estrategia de Caché

- **Lectura** (`GET /tasks`): consulta Redis primero; si no hay hit, consulta la BD y almacena el resultado.
- **Formato de clave**: `tasks:user:{userId}[:status:{status}]:page:{page}:limit:{limit}`
- **Invalidación**: en cada `POST`, `PATCH` o `DELETE`, se eliminan de Redis todas las claves que coincidan con `tasks:user:{userId}*`.
- **TTL**: 5 minutos (configurable mediante la variable de entorno `REDIS_TTL` en segundos).

---

## Variables de Entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `DATABASE_URL` | — | Cadena de conexión a PostgreSQL |
| `REDIS_HOST` | `localhost` | Host de Redis |
| `REDIS_PORT` | `6379` | Puerto de Redis |
| `REDIS_TTL` | `300` | TTL de caché en segundos |
| `JWT_SECRET` | — | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiración del JWT |
