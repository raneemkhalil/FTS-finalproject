# Distributed Multi-Tenant Log Ingestion & Analytics Engine

A high-throughput, distributed log management and aggregation platform built with **Node.js / Express**, **TypeScript**, **PostgreSQL / TimescaleDB**, and **Drizzle ORM**, load-balanced via **Caddy**.

---

## Table of Contents

1. [Setup Instructions](#1-setup-instructions)
2. [API Documentation](#2-api-documentation)
3. [Schema Design](#3-schema-design)
4. [Index Design](#4-index-design)
5. [Attribute Storage Strategy](#5-attribute-storage-strategy)
6. [Retention Strategy](#6-retention-strategy)
7. [Load-Test Methodology](#7-load-test-methodology)
8. [Measured Performance Results & Optimizations](#8-measured-performance-results--optimizations)
9. [Known Limitations](#9-known-limitations)
10. [Optional Features, Defaults, and Configuration Variables](#10-optional-features-defaults-and-configuration-variables)

---

## 1. Setup Instructions

### Prerequisites
- **Node.js**: v20+ (LTS recommended)
- **Docker & Docker Compose**: v2.20+
- **PostgreSQL / TimescaleDB**: PostgreSQL 15+ with TimescaleDB extension enabled (or run via Docker)

---

### Option A: Running with Docker Compose (Recommended)

The easiest way to launch the entire production-grade stack (TimescaleDB, Migration worker, 3 Load-Balanced API instances, and Caddy Reverse Proxy):

1. **Clone the repository and navigate to the project directory:**
   ```bash
   git clone https://github.com/raneemkhalil/FTS-finalproject.git
   cd FTS-finalproject
   ```

2. **Configure Environment Variables:**
   Create a `.env` file (or rely on the defaults defined in `docker-compose.yaml`):
   ```env
   SECRET=tU0n5P1kUKv7MV2jafd+DfZfbSblLdxcElzgqHTofPQ=
   AUTH_ENABLED=false
   HOST=db
   PORT=8080
   LOADGEN_API_KEY=
   ```

3. **Start all services:**
   ```bash
   docker compose up --build
   ```

   **Services initialized:**
   - `db`: TimescaleDB (PostgreSQL 15) on port `5432` with tuned memory settings.
   - `db-migrate`: Automatically runs schema & tenant migrations on startup.
   - `api-1`, `api-2`, `api-3`: Scaled API instances listening internally on ports `8081`, `8082`, `8083`.
   - `load-balancer`: Caddy reverse proxy distributing traffic to API replicas on port `8080`.

4. **Verify Health:**
   ```bash
   curl http://localhost:8080/health
   ```

---

### Option B: Running Locally (Development Mode)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Local TimescaleDB Instance:**
   ```bash
   docker run -d --name local-timescaledb \
     -p 5432:5432 \
     -e POSTGRES_PASSWORD=1234 \
     -e POSTGRES_DB=logs \
     timescale/timescaledb:latest-pg15
   ```

3. **Build TypeScript:**
   ```bash
   npm run build
   ```

4. **Run Shared & Tenant Migrations:**
   ```bash
   # Migrate public catalog schema
   npm run migrate-shared

   # Create and migrate default/tenant schema
   npm run setup default
   # Or create custom tenant: npm run create-tenant acme
   ```

5. **Start Application Server:**
   ```bash
   npm run server
   ```

6. **(Optional) Generate Synthetic Log Dataset:**
   ```bash
   npm run generate-logs 10000
   ```

---

## 2. API Documentation

### Base URL
```
http://localhost:8080
```

### Authentication Model
- Configured via `AUTH_ENABLED="true"` environment variable.
- When enabled, requests require an `Authorization` header with the tenant name and API key:
  ```http
  Authorization: Bearer <tenant_name> <api_key>
  ```
- When `AUTH_ENABLED="false"`, requests automatically fall back to the `default` tenant schema without requiring credentials.

---

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root server status check | No |
| `GET` | `/health` | Health & migration readiness check | No |
| `POST` | `/logs` | Ingest log entries in bulk (async queued) | If enabled |
| `GET` | `/logs` | Query and filter paginated logs | If enabled |
| `GET` | `/logs/:id` | Retrieve single log by composite lookup ID | If enabled |
| `GET` | `/logs/aggregate` | Time-bucketed aggregation and grouping | If enabled |

---

### Detailed Endpoint Specifications

#### 1. Ingest Logs
- **`POST /logs`**
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "logs": [
      {
        "timestamp": "2026-08-21T12:00:00.000Z",
        "level": "info",
        "service": "auth-service",
        "message": "User logged in successfully",
        "attributes": {
          "user_id": "1042",
          "region": "us-east",
          "retries": 0
        }
      }
    ]
  }
  ```
- **Validation Rules**:
  - `timestamp`: Valid ISO-8601 string (cannot be more than 5 minutes in the future).
  - `level`: Must be one of `["debug", "info", "warn", "error"]`.
  - `service`: Non-empty string.
  - `message`: Non-empty string.
  - `attributes`: JSON object containing primitive values (`string`, `number`, `boolean`).
- **Response `200 OK`**:
  ```json
  {
    "accepted": 1,
    "rejected": []
  }
  ```
- **Partial Rejection Response**:
  ```json
  {
    "accepted": 1,
    "rejected": [
      {
        "index": 1,
        "reason": "level: Invalid enum value"
      }
    ]
  }
  ```

---

#### 2. Query Logs (Search & Pagination)
- **`GET /logs`**
- **Query Parameters**:
  - `limit` *(optional, integer)*: Maximum logs to return (default: `100`, max: `1000`).
  - `cursor` *(optional, string)*: Hex-encoded timestamp and type cursor for pagination.
  - `since` *(optional, ISO string)*: Lower time boundary (`time >= since`).
  - `until` *(optional, ISO string)*: Upper time boundary (`time < until`).
  - `level` *(optional, string)*: Filter by level (`debug`, `info`, `warn`, `error`).
  - `service` *(optional, string)*: Exact match on service name.
  - `q` *(optional, string)*: Substring text match inside `message`.
  - `attr.<key>=<val>` *(optional, string)*: Filter by JSONB attributes (e.g. `attr.region=us-east`).
- **Response `200 OK`**:
  ```json
  {
    "next": "http://localhost:8080/logs?limit=100&cursor=323032362d30382d32315431313a35393a30302e3030305a",
    "previous": null,
    "count": 100,
    "logs": [
      {
        "id": "323032362d30382d32312031323a30303a30302e3030302b30307c617574682d736572766963657c66343761633130622d353863632d343337322d613536372d306530326232633364343739",
        "timestamp": "2026-08-21T12:00:00.000Z",
        "level": "info",
        "service": "auth-service",
        "message": "User logged in successfully",
        "attributes": {
          "user_id": "1042",
          "region": "us-east",
          "retries": 0
        }
      }
    ],
    "next_cursor": "323032362d30382d32315431313a35393a30302e3030305a"
  }
  ```

---

#### 3. Single Log Lookup
- **`GET /logs/:id`**
- **Path Parameter**: `id` - Hex-encoded string of `time|service_name|request_id`.
- **Response `200 OK`**:
  ```json
  {
    "id": "323032362d30382d32312031323a30303a30302e3030302b30307c617574682d736572766963657c66343761633130622d353863632d343337322d613536372d306530326232633364343739",
    "timestamp": "2026-08-21T12:00:00.000Z",
    "level": "info",
    "service": "auth-service",
    "message": "User logged in successfully",
    "attributes": {
      "user_id": "1042",
      "region": "us-east"
    }
  }
  ```

---

#### 4. Log Aggregations
- **`GET /logs/aggregate`**
- **Query Parameters**:
  - `since` *(required, ISO string)*: Start of time range.
  - `until` *(required, ISO string)*: End of time range.
  - `bucket` *(required, string)*: Duration bucket (e.g., `1m`, `5m`, `1h`, `1d`).
  - `group_by` *(optional, string)*: Grouping field (`level` or `service`).
- **Response `200 OK`**:
  ```json
  {
    "buckets": [
      {
        "start": "2026-08-21T12:00:00.000Z",
        "group": "error",
        "count": 42
      },
      {
        "start": "2026-08-21T12:00:00.000Z",
        "group": "info",
        "count": 1280
      }
    ]
  }
  ```

---

#### 5. Health Check
- **`GET /health`**
- **Response `200 OK`**:
  ```json
  {
    "db": {
      "status": "success"
    },
    "migration": {
      "status": "success"
    },
    "info": "Server is ready to listen"
  }
  ```

---

## 3. Schema Design

The engine implements a **Schema-Per-Tenant Multi-Tenancy Architecture**, isolating customer data into dedicated PostgreSQL schemas while managing tenant records centrally in the `public` schema.

```
                  ┌───────────────────────────────┐
                  │        public.tenants         │
                  ├───────────────────────────────┤
                  │ tenant_id   (UUID PK)         │
                  │ tenant_name (TEXT UNIQUE)     │
                  │ schema_name (TEXT UNIQUE)     │
                  │ created_at  (TIMESTAMP)       │
                  └──────────────┬────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌─────────────────────────┐                 ┌─────────────────────────┐
│     tenant_a.logs       │                 │     tenant_b.logs       │
│ (Timescale Hypertable)  │                 │ (Timescale Hypertable)  │
├─────────────────────────┤                 ├─────────────────────────┤
│ request_id   (UUID)     │                 │ request_id   (UUID)     │
│ level        (TEXT)     │                 │ level        (TEXT)     │
│ service_name (TEXT)     │                 │ service_name (TEXT)     │
│ time         (TIMESTAMPTZ)                │ time         (TIMESTAMPTZ)
│ message      (TEXT)     │                 │ message      (TEXT)     │
│ attributes   (JSONB)    │                 │ attributes   (JSONB)    │
│ PK: (request_id, time,  │                 │ PK: (request_id, time,  │
│      service_name)      │                 │      service_name)      │
├─────────────────────────┤                 ├─────────────────────────┤
│   tenant_a.api_keys     │                 │   tenant_b.api_keys     │
├─────────────────────────┤                 ├─────────────────────────┤
│ token      (VARCHAR PK) │                 │ token      (VARCHAR PK) │
│ created_at (TIMESTAMP)  │                 │ created_at (TIMESTAMP)  │
│ updated_at (TIMESTAMP)  │                 │ updated_at (TIMESTAMP)  │
└─────────────────────────┘                 └─────────────────────────┘
```

### Detailed Table Definitions

#### 1. `public.tenants` (Shared Catalog)
```sql
CREATE TABLE "tenants" (
    "tenant_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_name" text NOT NULL UNIQUE,
    "schema_name" text NOT NULL UNIQUE,
    "created_at" timestamp DEFAULT now() NOT NULL
);
```

#### 2. `<tenant>.logs` (Tenant TimescaleDB Hypertable)
```sql
CREATE TABLE "<tenant>"."logs" (
    "request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "level" text NOT NULL,
    "service_name" text NOT NULL,
    "time" timestamp with time zone DEFAULT now() NOT NULL,
    "message" text,
    "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT "logs_pk" PRIMARY KEY("request_id", "time", "service_name")
);
```

#### 3. `<tenant>.api_keys` (Tenant API Keys)
```sql
CREATE TABLE "<tenant>"."api_keys" (
    "token" varchar(256) PRIMARY KEY NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
```

#### 4. TimescaleDB Hypertable Partitioning
Each tenant's `logs` table is converted into a hypertable:
- **Primary Time Dimension**: Partitioned on column `time` with a **1-day chunk interval**.
- **Secondary Space Dimension**: Hash-partitioned on `service_name` across **32 partitions**.

---

## 4. Index Design

To maintain sub-millisecond query execution while sustaining thousands of writes per second, indexes are strategically selected:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    Index Architecture                                  │
├───────────────────────┬──────────────┬────────────────────────┬────────────────────────┤
│ Index Name            │ Type         │ Columns / Expression   │ Purpose                │
├───────────────────────┼──────────────┼────────────────────────┼────────────────────────┤
│ logs_pk               │ B-Tree       │ (request_id, time,     │ Uniqueness, composite  │
│                       │              │  service_name)         │ lookups, partition key │
│ time_idx (automatic)  │ B-Tree       │ time DESC              │ Time-range queries &   │
│                       │              │                        │ chunk pruning          │
│ logs_attribute_idx    │ GIN          │ attributes             │ JSONB containment      │
│                       │ (fastupdate) │                        │ (@>) queries           │
└───────────────────────┴──────────────┴────────────────────────┴────────────────────────┘
```

### 1. Primary Key Index (`logs_pk`)
- **Structure**: Composite B-Tree on `(request_id, time, service_name)`.
- **Rationale**: TimescaleDB requires all unique constraints to include the partitioning column (`time`). Adding `service_name` ensures partition co-location and uniqueness per ingestion batch.

### 2. Time-Series Hypertable Index (Chunk-Level B-Tree)
- **Structure**: B-Tree on `time DESC`.
- **Rationale**: Created automatically by TimescaleDB on each 1-day chunk. Allows queries with `since`, `until`, or `ORDER BY time DESC` to prune irrelevant chunks instantly.

### 3. GIN Attributes Index (`logs_attribute_idx`)
- **Structure**: `CREATE INDEX logs_attribute_idx ON "<tenant>".logs USING GIN (attributes) WITH (fastupdate = on);`
- **Rationale**: Enables lightning-fast querying on arbitrary JSON metadata keys (e.g. `attributes @> '{"user_id":"1042"}'::jsonb`).
- **Write Optimization (`fastupdate = on`)**: Buffers GIN index entries in memory/pending list to eliminate the standard GIN insertion write penalty, synced with PostgreSQL's `gin_pending_list_limit = 4MB`.

---

## 5. Attribute Storage Strategy

Modern observability systems ingest unstructured and semi-structured metadata alongside core log fields.

### Strategy Implementation
1. **JSONB Data Type**:
   Attributes are stored as binary JSON (`jsonb`) with a default empty object `'{}'::jsonb`.
2. **Schema-Free Flexibility**:
   Allows microservices to send arbitrary tags (`user_id`, `region`, `retries`, `http_status`, etc.) without requiring database schema changes or sparse relational columns.
3. **Strict Ingestion Validation**:
   Zod schema validates that attribute objects only contain valid primitive scalar values (`string`, `number`, `boolean`), rejecting nested payloads to maintain uniform query indexing performance.
4. **SQL-Injection-Safe Containment Queries**:
   URL query parameters in the form `attr.<key>=<value>` are validated through strict alphanumeric regex `^[a-zA-Z0-9_\-\.]+$` and converted to PostgreSQL JSON containment operators:
   ```sql
   WHERE attributes @> '{"region":"us-east"}'::jsonb
   ```

---

## 6. Retention Strategy

Log volumes grow rapidly over time. Storing indefinitely wastes storage and degrades performance.

```
Ingestion ──► [ Day 1-30: Active Hypertable Chunks ] ──► [ >30 Days: Dropped via Retention Policy ]
```

### 1. Automated Chunk Dropping (30-Day TTL)
- Configured via TimescaleDB native retention policy:
  ```sql
  SELECT add_retention_policy('<tenant>.logs', INTERVAL '30 days', if_not_exists => true);
  ```
- **How It Works**: TimescaleDB background workers automatically drop data chunks older than 30 days.
- **Performance Impact**: Unlike standard relational databases that execute slow `DELETE FROM logs WHERE time < ...` queries (which generate massive write-ahead logs, cause disk fragmentation, and lock tables), TimescaleDB drops entire 1-day chunk files directly from the filesystem ($O(1)$ catalog drop), incurring zero row-by-row CPU or I/O overhead.

### 2. Omission of Columnar Chunk Compression
- **Design Decision**: TimescaleDB native columnar chunk compression was evaluated and intentionally disabled (`migrate-schemas.ts`).
- **Rationale**:
  - **Memory Constraints**: The deployment environment enforces strict memory limits (256MB per API container and constrained database resources). TimescaleDB background compression workers require substantial dedicated RAM (`maintenance_work_mem` and decompression cache) to segment, reorder, and compress data chunks.
  - **Heavy Write Workload**: In high-throughput ingestion environments, concurrent compression jobs compete with incoming write buffers for CPU and memory, causing cache thrashing and latency spikes.
  - **Optimal Alternative**: Relying exclusively on **uncompressed 1-day hypertable chunks** paired with automated $O(1)$ chunk drops keeps the database memory footprint lean, predictable, and fully optimized for maximum ingestion throughput.

---

## 7. Load-Test Methodology

The project includes built-in tools and architectural support for stress testing under extreme ingestion volumes:

```
┌─────────────────────────┐        HTTP POST /logs        ┌───────────────────────┐
│ generate-logs.ts /      │ ────────────────────────────► │   Caddy Load Balancer │
│ Load Generator          │        (10K+ logs/batch)      └───────────┬───────────┘
└─────────────────────────┘                                           │ Round-Robin
                                               ┌──────────────────────┼──────────────────────┐
                                               ▼                      ▼                      ▼
                                        ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
                                        │ API Node 1  │        │ API Node 2  │        │ API Node 3  │
                                        └──────┬──────┘        └──────┬──────┘        └──────┬──────┘
                                               │                      │                      │
                                               │ In-Memory LogQueue   │ In-Memory LogQueue   │ In-Memory LogQueue
                                               │ (Batch: 3000 / 50ms) │ (Batch: 3000 / 50ms) │ (Batch: 3000 / 50ms)
                                               └──────────────────────┼──────────────────────┘
                                                                      ▼ Bulk INSERT
                                                         ┌───────────────────────────┐
                                                         │ TimescaleDB (PostgreSQL)  │
                                                         └───────────────────────────┘
```

### 1. Synthetic Log Generation
- Executed via `npm run generate-logs <count>` (`src/scripts/generate-logs.ts`).
- Generates realistic, weighted distributions across:
  - 6 services (`auth-service`, `checkout`, `payment-gateway`, `inventory-api`, `user-service`, `notifications`).
  - 4 log levels (`info`, `warn`, `error`, `debug`).
  - Attributes with user IDs, geographic regions, and retry counts over a 30-day time window.

### 2. High-Throughput Ingestion Testing
- External load generators send high-frequency concurrent `POST /logs` batches.
- Multi-worker setup: 3 API instances behind Caddy test round-robin load distribution and connection pool limits.

### 3. Benchmarks Test Results

The test suite evaluates four core pillars under heavy load: **Correctness**, **Performance**, **Query Latency**, and **Reliability**.

#### Benchmark Run 1
![Methodology Test - Run 1](./assets/load-test-run-1.png)

#### Benchmark Run 2 (Optimized)
![Methodology Test - Run 2](./assets/load-test-run-2.png)

#### Test Output Breakdown

| Metric Pillar | Run 1 Score / Result | Run 2 Score / Result | Key Observations |
| :--- | :--- | :--- | :--- |
| **Performance** | `38.3 / 50` | `42.0 / 50` | Sustained **~15,000 logs/sec** ingestion throughput with **0.0% errors**; ingestion p95 reduced from **699ms** to **369ms**. |
| **Queries** | `0.0 / 15` (p95: 651ms) | `4.2 / 15` (p95: 268ms) | Time-bucketed aggregation p95 latency improved by **58.8%** down to **268ms**. |
| **Reliability** | `20.0 / 20` (4/4) | `20.0 / 20` (4/4) | **100% pass rate** across all failure, load-spike, and concurrency scenarios. |
| **Correctness** | `10.0 / 15` (10/15) | `10.0 / 15` (10/15) | Passed 10/15 validation checks under heavy concurrent write load. |

---

## 8. Measured Performance Results & Optimizations

To handle production log streams, several critical optimizations were implemented across the stack:

### 1. Ingestion Driver & Query Strategy Comparison

To achieve maximum write throughput under tight memory limits, we evaluated two bulk insertion paradigms:

<!--![Bulk Insertion Comparison](./assets/bulk-insertion-comparison.png) -->

| Method | Speed | Safety / Type-checking | Notes |
| :--- | :--- | :--- | :--- |
| **`postgres.js` tagged template** (Implemented in `log-queue.ts`) | ⚡ **Fastest** | High | Bypasses ORM query-building overhead; packs and serializes parameters directly over the wire. |
| **Drizzle `db.insert()`** (Used in standard migrations) | Fast | Full TypeScript support | Requires keeping batch sizes below ~2,000 items per insert to avoid PostgreSQL parameter count limits ($65,535$). |

---

### 2. Comprehensive Optimization Action Plan

The following optimization matrix details the specific architectural changes applied across each component and their direct performance impacts:

<!--![Optimization Action Plan](./assets/optimization-action-plan.png) -->

| Component | Action | Expected Impact |
| :--- | :--- | :--- |
| **API / Middleware** | Fix global `result` race condition in `log-validations.ts` | Prevents concurrency crashes and response payload corruption under high RPS. |
| **Schema Validation** | Replace heavy Luxon/Zod validation with compiled/fast validator | Saves ~50–70% CPU time in the Node.js event loop during high-volume ingestion. |
| **Ingestion Queue** | Use native bulk SQL via `postgres.js` + queue concurrency locking in `log-queue.ts` | Completely removes ORM parameter serialization overhead and unblocks database writes. |
| **Database** | Remove space partitioning (`number_partitions => 32`) and tune GIN indexing | Cuts chunk lock contention and write amplification during hypertable ingestion. |
| **Client / Ingestion** | Post in batches of 500–1,000 logs per HTTP request | Reduces network round-trips and HTTP body parsing overhead by 99%. |
| **Resources** | Increase DB CPU/RAM and scale API instances in `docker-compose.yaml` | Provides sufficient compute to sustain ~15k–20k inserts/sec without throttling. |

---

### 3. Key Optimizations Applied

1. **In-Memory Asynchronous Queue Buffer (`LogQueue`)**:
   - `POST /logs` requests validate payloads and immediately push logs into an in-memory queue, returning `200 OK` in `< 5ms`.
   - Flushes in bulk when the queue reaches **3,000 logs** or every **50ms**.
   - Database bulk writes execute with parameterized bulk statements (`INSERT INTO <tenant>.logs (...) ON CONFLICT DO NOTHING`).

2. **PostgreSQL / TimescaleDB Engine Tuning (`docker-compose.yaml`)**:
   - `synchronous_commit = off`: Eliminates disk I/O wait on every transaction, boosting batch write throughput by up to 10x.
   - `shared_buffers = 256MB`: Allocates 25% of available container RAM for query caching.
   - `work_mem = 4MB`: Speeds up time-bucket aggregation sorts without CPU thrashing.
   - `maintenance_work_mem = 64MB`: Accelerates hypertable chunk creation and GIN indexing.
   - `gin_pending_list_limit = 4MB`: Expands GIN buffer to prevent frequent synchronous index flushing.

3. **Horizontal Scaling via Caddy Reverse Proxy**:
   - Traffic is load-balanced across 3 API processes with CPU and memory limits (`cpus: 0.5`, `memory: 256M`).

4. **Chunk Pruning & Hypertable Partitioning**:
   - Aggregations and range queries filter only the relevant 1-day chunks, keeping query response times consistent even as total dataset size scales to millions of records.

---

## 9. Known Limitations

1. **In-Memory Queue Volatility on Unexpected Crash**:
   - Logs buffered in `logQueue` (up to 3,000 records or within the 50ms flush window) reside in Node.js process memory. If an API container crashes before flushing, buffered logs in that batch may be lost.
   - *Production mitigation*: Introduce a persistent write-ahead broker (e.g. Apache Kafka or Redis Stream) for zero-loss durability.

2. **Single Database Instance (No HA Replication)**:
   - The database runs as a standalone TimescaleDB container. While performant, it represents a single point of failure without active-passive replica failover.

3. **Message Search Query Scanning**:
   - Text search (`q` query param) uses `message LIKE '%<q>%'`. While bounded by time chunks, substring queries with leading wildcards cannot use standard B-Tree indexes.
   - *Production mitigation*: Implement PostgreSQL `pg_trgm` GIN index or full-text search `tsvector`.

4. **In-Memory Cursor Pointer Cache**:
   - Next/Previous cursor pointer metadata uses an in-memory object in `set-pointers-urls.ts`. In a multi-replica load-balanced deployment, cursor requests are stateless but pointer cache lookups rely on URL query decoding.

---

## 10. Optional Features, Defaults, and Configuration Variables

All application behavior can be configured through environment variables:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `number` | `8080` (or `8081`-`8083` in docker) | HTTP port the Express server listens on. |
| `HOST` | `string` | `"localhost"` (`"db"` in docker) | Database hostname or container name. |
| `POSTGRES_DB` | `string` | `"logs"` | Name of the PostgreSQL database. |
| `POSTGRES_PASSWORD` | `string` | `"1234"` | Database password for `postgres` user. |
| `SECRET` | `string` | `"tU0n5P1kUKv7MV2jafd+DfZfbSblLdxcElzgqHTofPQ="` | Secret key for JWT verification and token signing. |
| `AUTH_ENABLED` | `string` | `"false"` | When set to `"true"`, enforces API key authentication per tenant. When `"false"`, bypasses auth and defaults to default tenant. |
| `LOADGEN_API_KEY` | `string` | `""` | Optional pre-configured API key for automated test harnesses. |
| `NODE_ENV` | `string` | `"development"` (`"production"` in Docker) | Node runtime environment mode. |

### NPM Scripts Reference

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run build` | `npx tsc` | Compiles TypeScript into `dist/`. |
| `npm run server` | `node dist/index.js` | Starts the Express server. |
| `npm run makemigrations` | `npx drizzle-kit generate` | Generates SQL migration files from Drizzle schema. |
| `npm run migrate-shared` | `node dist/db/scripts/migrate-shared.js` | Runs migrations on the shared `public` schema. |
| `npm run migrate-schemas` | `node dist/db/scripts/migrate-schemas.js` | Applies migrations to all registered tenant schemas. |
| `npm run create-tenant -- <name>` | `node dist/db/scripts/create-tenant.js <name>` | Provisions a new isolated tenant schema and hypertable. |
| `npm run setup <name>` | `node dist/scripts/setup.js <name>` | Initializes database, creates tenant schema, and provisions API keys. |
| `npm run generate-logs <N>` | `node dist/scripts/generate-logs.js <N>` | Generates a mock dataset of `N` log entries in `logs.json`. |
