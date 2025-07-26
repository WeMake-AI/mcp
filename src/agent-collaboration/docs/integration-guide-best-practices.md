# Integration Guide and Best Practices

This comprehensive guide provides best practices, common patterns,
troubleshooting tips, and performance optimization recommendations for
integrating and using the agent collaboration system.

## Table of Contents

1. [Quick Start Integration](#quick-start-integration)
2. [Architecture Patterns](#architecture-patterns)
3. [Configuration Best Practices](#configuration-best-practices)
4. [Development Workflow](#development-workflow)
5. [Performance Optimization](#performance-optimization)
6. [Security Guidelines](#security-guidelines)
7. [Monitoring and Observability](#monitoring-and-observability)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Common Integration Patterns](#common-integration-patterns)
10. [Testing Strategies](#testing-strategies)
11. [Deployment Considerations](#deployment-considerations)
12. [Migration Guide](#migration-guide)

## Quick Start Integration

### Prerequisites

- Node.js 18+ or Bun runtime
- TypeScript 5.0+
- MCP (Model Context Protocol) compatible environment
- Basic understanding of graph databases and agent systems

### Installation

```bash
# Using Bun (recommended)
bun add @wemake/knowledge-graph-memory

# Using npm
npm install @wemake/knowledge-graph-memory

# Using yarn
yarn add @wemake/knowledge-graph-memory
```

### Basic Setup

```typescript
import { KnowledgeGraphMemory } from "@wemake/knowledge-graph-memory";

// Initialize the knowledge graph
const kg = new KnowledgeGraphMemory({
  storage: {
    type: "file", // or 'memory', 'redis', 'postgres'
    path: "./data/knowledge-graph.json"
  },
  collaboration: {
    enabled: true,
    agentId: "my-agent-001",
    capabilities: ["data-processing", "analysis", "reporting"]
  },
  performance: {
    cacheSize: 1000,
    indexingEnabled: true,
    batchSize: 100
  }
});

// Register your agent
await kg.registerAgent({
  id: "my-agent-001",
  name: "Data Processing Agent",
  capabilities: ["data-processing", "analysis"],
  metadata: {
    version: "1.0.0",
    environment: "production"
  }
});

// Start collaboration
await kg.startCollaboration();
```

### MCP Server Integration

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KnowledgeGraphMemoryMCP } from "@wemake/knowledge-graph-memory/mcp";

const server = new Server(
  {
    name: "knowledge-graph-memory",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// Initialize MCP tools
const mcpTools = new KnowledgeGraphMemoryMCP(kg);
await mcpTools.registerTools(server);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Architecture Patterns

### 1. Microservices Pattern

```typescript
// Service-oriented architecture with dedicated agents
class DataProcessingService {
  private kg: KnowledgeGraphMemory;
  private agentId: string;

  constructor(config: ServiceConfig) {
    this.agentId = `data-processor-${config.instanceId}`;
    this.kg = new KnowledgeGraphMemory({
      collaboration: {
        enabled: true,
        agentId: this.agentId,
        capabilities: ["data-processing", "validation"]
      }
    });
  }

  async processData(data: any): Promise<ProcessingResult> {
    // Create workflow for data processing
    const workflowId = await this.kg.createWorkflow({
      name: "Data Processing Pipeline",
      description:
        "Process incoming data through validation and transformation",
      participants: [this.agentId]
    });

    try {
      // Delegate validation task
      const validationTask = await this.kg.delegateTask({
        workflowId,
        taskType: "validation",
        targetCapabilities: ["data-validation"],
        data: { input: data },
        priority: "high"
      });

      // Wait for validation completion
      const validationResult = await this.waitForTaskCompletion(
        validationTask.id
      );

      if (validationResult.status === "success") {
        // Process validated data
        return await this.transformData(validationResult.data);
      } else {
        throw new Error(`Validation failed: ${validationResult.error}`);
      }
    } finally {
      await this.kg.updateWorkflowStatus(workflowId, "completed");
    }
  }
}
```

### 2. Event-Driven Pattern

```typescript
// Event-driven collaboration with reactive agents
class EventDrivenAgent {
  private kg: KnowledgeGraphMemory;
  private eventHandlers: Map<string, EventHandler>;

  constructor(agentId: string) {
    this.kg = new KnowledgeGraphMemory({
      /* config */
    });
    this.eventHandlers = new Map();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Subscribe to relevant events
    this.kg.subscribeToEvents({
      eventTypes: ["task_delegated", "resource_shared", "workflow_updated"],
      callback: this.handleEvent.bind(this)
    });
  }

  private async handleEvent(event: CollaborationEvent): Promise<void> {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      await handler(event);
    }
  }

  // Register event handlers
  onTaskDelegated(handler: (event: TaskDelegatedEvent) => Promise<void>): void {
    this.eventHandlers.set("task_delegated", handler);
  }

  onResourceShared(
    handler: (event: ResourceSharedEvent) => Promise<void>
  ): void {
    this.eventHandlers.set("resource_shared", handler);
  }
}
```

### 3. Pipeline Pattern

```typescript
// Sequential processing pipeline with agent coordination
class ProcessingPipeline {
  private stages: PipelineStage[];
  private kg: KnowledgeGraphMemory;

  constructor(stages: PipelineStage[]) {
    this.stages = stages;
    this.kg = new KnowledgeGraphMemory({
      /* config */
    });
  }

  async execute(input: any): Promise<any> {
    const workflowId = await this.kg.createCollaborativeWorkflow({
      name: "Processing Pipeline",
      stages: this.stages.map((stage) => ({
        name: stage.name,
        requiredCapabilities: stage.capabilities,
        dependencies: stage.dependencies
      }))
    });

    let currentData = input;

    for (const stage of this.stages) {
      const task = await this.kg.assignTaskToAgent({
        workflowId,
        taskType: stage.type,
        requiredCapabilities: stage.capabilities,
        input: currentData,
        dependencies: stage.dependencies
      });

      const result = await this.waitForTaskCompletion(task.id);
      currentData = result.output;

      // Share intermediate results if needed
      if (stage.shareResults) {
        await this.kg.shareResource({
          resourceId: `stage-${stage.name}-output`,
          data: currentData,
          accessLevel: "read",
          sharedWith: this.getDownstreamAgents(stage)
        });
      }
    }

    return currentData;
  }
}
```

## Configuration Best Practices

### Environment-Specific Configuration

```typescript
// config/environments.ts
export const configurations = {
  development: {
    storage: {
      type: "file",
      path: "./dev-data/kg.json"
    },
    collaboration: {
      enabled: true,
      heartbeatInterval: 5000,
      timeoutThreshold: 30000
    },
    performance: {
      cacheSize: 100,
      batchSize: 10,
      indexingEnabled: false
    },
    logging: {
      level: "debug",
      enableTracing: true
    }
  },

  production: {
    storage: {
      type: "postgres",
      connectionString: process.env.DATABASE_URL,
      poolSize: 20
    },
    collaboration: {
      enabled: true,
      heartbeatInterval: 10000,
      timeoutThreshold: 60000,
      maxConcurrentTasks: 100
    },
    performance: {
      cacheSize: 10000,
      batchSize: 500,
      indexingEnabled: true,
      compressionEnabled: true
    },
    logging: {
      level: "info",
      enableTracing: false
    },
    security: {
      encryptionEnabled: true,
      accessControlEnabled: true,
      auditLogging: true
    }
  },

  testing: {
    storage: {
      type: "memory"
    },
    collaboration: {
      enabled: false
    },
    performance: {
      cacheSize: 50,
      batchSize: 5
    }
  }
};

// Usage
const config = configurations[process.env.NODE_ENV || "development"];
const kg = new KnowledgeGraphMemory(config);
```

### Dynamic Configuration

```typescript
// config/dynamic-config.ts
class DynamicConfiguration {
  private config: Configuration;
  private watchers: ConfigWatcher[];

  constructor(baseConfig: Configuration) {
    this.config = baseConfig;
    this.watchers = [];
    this.setupConfigWatching();
  }

  private setupConfigWatching(): void {
    // Watch for configuration changes
    if (process.env.CONFIG_SOURCE === "consul") {
      this.watchConsul();
    } else if (process.env.CONFIG_SOURCE === "etcd") {
      this.watchEtcd();
    } else {
      this.watchFileSystem();
    }
  }

  async updateConfiguration(updates: Partial<Configuration>): Promise<void> {
    this.config = { ...this.config, ...updates };

    // Notify watchers
    for (const watcher of this.watchers) {
      await watcher.onConfigChange(this.config);
    }
  }

  getConfiguration(): Configuration {
    return this.config;
  }

  addWatcher(watcher: ConfigWatcher): void {
    this.watchers.push(watcher);
  }
}
```

## Development Workflow

### 1. Local Development Setup

```bash
# Clone and setup
git clone <repository>
cd knowledge-graph-memory
bun install

# Setup development environment
cp .env.example .env.development

# Start development with hot reload
bun run dev

# Run tests in watch mode
bun run test:watch

# Start MCP server for testing
bun run mcp:dev
```

### 2. Testing Workflow

```typescript
// tests/integration/collaboration.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnowledgeGraphMemory } from "../src/index";

describe("Agent Collaboration Integration", () => {
  let kg1: KnowledgeGraphMemory;
  let kg2: KnowledgeGraphMemory;

  beforeEach(async () => {
    // Setup test environment
    kg1 = new KnowledgeGraphMemory({
      storage: { type: "memory" },
      collaboration: {
        enabled: true,
        agentId: "test-agent-1"
      }
    });

    kg2 = new KnowledgeGraphMemory({
      storage: { type: "memory" },
      collaboration: {
        enabled: true,
        agentId: "test-agent-2"
      }
    });

    await kg1.startCollaboration();
    await kg2.startCollaboration();
  });

  afterEach(async () => {
    await kg1.stopCollaboration();
    await kg2.stopCollaboration();
  });

  it("should enable task delegation between agents", async () => {
    // Register agents with different capabilities
    await kg1.registerAgent({
      id: "test-agent-1",
      capabilities: ["data-processing"]
    });

    await kg2.registerAgent({
      id: "test-agent-2",
      capabilities: ["data-validation"]
    });

    // Create workflow
    const workflowId = await kg1.createWorkflow({
      name: "Test Workflow",
      participants: ["test-agent-1", "test-agent-2"]
    });

    // Delegate task from agent 1 to agent 2
    const task = await kg1.delegateTask({
      workflowId,
      taskType: "validation",
      targetCapabilities: ["data-validation"],
      data: { input: "test data" }
    });

    // Agent 2 should receive and accept the task
    const receivedTasks = await kg2.getAgentTasks("test-agent-2");
    expect(receivedTasks).toHaveLength(1);
    expect(receivedTasks[0].id).toBe(task.id);

    // Accept and complete the task
    await kg2.acceptDelegation(task.id);
    await kg2.completeTask(task.id, { result: "validated" });

    // Verify task completion
    const completedTask = await kg1.getTaskStatus(task.id);
    expect(completedTask.status).toBe("completed");
  });
});
```

### 3. Debugging Workflow

```typescript
// utils/debug.ts
export class DebugHelper {
  private kg: KnowledgeGraphMemory;

  constructor(kg: KnowledgeGraphMemory) {
    this.kg = kg;
  }

  async dumpState(): Promise<SystemState> {
    return {
      agents: await this.kg.listActiveAgents(),
      workflows: await this.kg.getActiveWorkflows(),
      tasks: await this.kg.getPendingTasks(),
      resources: await this.kg.getSharedResources(),
      graph: await this.kg.readGraph()
    };
  }

  async validateIntegrity(): Promise<IntegrityReport> {
    const issues: IntegrityIssue[] = [];

    // Check for orphaned tasks
    const tasks = await this.kg.getAllTasks();
    for (const task of tasks) {
      if (task.workflowId) {
        const workflow = await this.kg.getWorkflow(task.workflowId);
        if (!workflow) {
          issues.push({
            type: "orphaned_task",
            taskId: task.id,
            description: `Task ${task.id} references non-existent workflow ${task.workflowId}`
          });
        }
      }
    }

    // Check for inactive agents with active tasks
    const activeAgents = await this.kg.listActiveAgents();
    const activeAgentIds = new Set(activeAgents.map((a) => a.id));

    for (const task of tasks) {
      if (task.assignedTo && !activeAgentIds.has(task.assignedTo)) {
        issues.push({
          type: "inactive_agent_task",
          taskId: task.id,
          agentId: task.assignedTo,
          description: `Task ${task.id} assigned to inactive agent ${task.assignedTo}`
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Performance Optimization

### 1. Caching Strategies

```typescript
// performance/caching.ts
class PerformanceOptimizer {
  private kg: KnowledgeGraphMemory;
  private cache: Map<string, CacheEntry>;
  private cacheStats: CacheStats;

  constructor(kg: KnowledgeGraphMemory) {
    this.kg = kg;
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  async optimizeQueries(): Promise<void> {
    // Implement query result caching
    const originalSearchNodes = this.kg.searchNodes.bind(this.kg);

    this.kg.searchNodes = async (query: SearchQuery) => {
      const cacheKey = this.generateCacheKey(query);
      const cached = this.cache.get(cacheKey);

      if (cached && !this.isCacheExpired(cached)) {
        this.cacheStats.hits++;
        return cached.data;
      }

      this.cacheStats.misses++;
      const result = await originalSearchNodes(query);

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: this.getTTL(query)
      });

      return result;
    };
  }

  async optimizeBatchOperations(): Promise<void> {
    // Implement batching for entity operations
    const batchQueue: EntityOperation[] = [];
    let batchTimeout: NodeJS.Timeout;

    const processBatch = async () => {
      if (batchQueue.length === 0) return;

      const batch = batchQueue.splice(0, 100); // Process in chunks of 100
      await this.kg.batchCreateEntities(batch.map((op) => op.entity));
    };

    const originalCreateEntity = this.kg.createEntity.bind(this.kg);

    this.kg.createEntity = async (entity: Entity) => {
      batchQueue.push({ type: "create", entity });

      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }

      batchTimeout = setTimeout(processBatch, 100); // Batch for 100ms

      if (batchQueue.length >= 100) {
        await processBatch();
      }
    };
  }

  async optimizeIndexing(): Promise<void> {
    // Create indexes for frequently queried fields
    await this.kg.createIndex({
      field: "entityType",
      type: "btree"
    });

    await this.kg.createIndex({
      field: "metadata.status",
      type: "hash"
    });

    await this.kg.createIndex({
      field: "observations",
      type: "fulltext"
    });
  }
}
```

### 2. Memory Management

```typescript
// performance/memory.ts
class MemoryManager {
  private kg: KnowledgeGraphMemory;
  private memoryThreshold: number;
  private cleanupInterval: NodeJS.Timer;

  constructor(kg: KnowledgeGraphMemory, thresholdMB: number = 500) {
    this.kg = kg;
    this.memoryThreshold = thresholdMB * 1024 * 1024; // Convert to bytes
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring(): void {
    this.cleanupInterval = setInterval(async () => {
      const memUsage = process.memoryUsage();

      if (memUsage.heapUsed > this.memoryThreshold) {
        await this.performCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  private async performCleanup(): Promise<void> {
    // Clear expired cache entries
    await this.kg.clearExpiredCache();

    // Archive old completed workflows
    const oldWorkflows = await this.kg.getCompletedWorkflows({
      olderThan: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    for (const workflow of oldWorkflows) {
      await this.kg.archiveWorkflow(workflow.id);
    }

    // Compact graph storage
    await this.kg.compactStorage();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}
```

### 3. Connection Pooling

```typescript
// performance/connection-pool.ts
class ConnectionPool {
  private pools: Map<string, Pool>;
  private config: PoolConfig;

  constructor(config: PoolConfig) {
    this.pools = new Map();
    this.config = config;
  }

  async getConnection(agentId: string): Promise<Connection> {
    let pool = this.pools.get(agentId);

    if (!pool) {
      pool = new Pool({
        min: this.config.minConnections,
        max: this.config.maxConnections,
        acquireTimeoutMillis: this.config.acquireTimeout,
        createTimeoutMillis: this.config.createTimeout,
        idleTimeoutMillis: this.config.idleTimeout,
        create: () => this.createConnection(agentId),
        destroy: (conn) => this.destroyConnection(conn),
        validate: (conn) => this.validateConnection(conn)
      });

      this.pools.set(agentId, pool);
    }

    return await pool.acquire();
  }

  async releaseConnection(
    agentId: string,
    connection: Connection
  ): Promise<void> {
    const pool = this.pools.get(agentId);
    if (pool) {
      await pool.release(connection);
    }
  }
}
```

## Security Guidelines

### 1. Authentication and Authorization

```typescript
// security/auth.ts
class SecurityManager {
  private kg: KnowledgeGraphMemory;
  private authProvider: AuthProvider;
  private accessControl: AccessControl;

  constructor(kg: KnowledgeGraphMemory, config: SecurityConfig) {
    this.kg = kg;
    this.authProvider = new AuthProvider(config.auth);
    this.accessControl = new AccessControl(config.rbac);
  }

  async authenticateAgent(credentials: AgentCredentials): Promise<AuthResult> {
    // Validate agent credentials
    const authResult = await this.authProvider.authenticate(credentials);

    if (!authResult.success) {
      throw new SecurityError("Authentication failed", {
        agentId: credentials.agentId,
        reason: authResult.reason
      });
    }

    // Generate access token
    const token = await this.authProvider.generateToken({
      agentId: credentials.agentId,
      capabilities: authResult.capabilities,
      expiresIn: "1h"
    });

    return {
      success: true,
      token,
      capabilities: authResult.capabilities
    };
  }

  async authorizeOperation(
    agentId: string,
    operation: string,
    resource: string,
    context?: OperationContext
  ): Promise<boolean> {
    // Check basic permissions
    const hasPermission = await this.accessControl.checkPermission(
      agentId,
      operation,
      resource
    );

    if (!hasPermission) {
      return false;
    }

    // Check contextual permissions
    if (context) {
      return await this.checkContextualPermissions(agentId, operation, context);
    }

    return true;
  }

  private async checkContextualPermissions(
    agentId: string,
    operation: string,
    context: OperationContext
  ): Promise<boolean> {
    // Workflow-specific permissions
    if (context.workflowId) {
      const workflow = await this.kg.getWorkflow(context.workflowId);
      if (!workflow.participants.includes(agentId)) {
        return false;
      }
    }

    // Resource-specific permissions
    if (context.resourceId) {
      const resource = await this.kg.getResource(context.resourceId);
      if (!resource.sharedWith.includes(agentId)) {
        return false;
      }
    }

    return true;
  }
}
```

### 2. Data Encryption

```typescript
// security/encryption.ts
class EncryptionManager {
  private encryptionKey: Buffer;
  private algorithm: string = "aes-256-gcm";

  constructor(key: string) {
    this.encryptionKey = Buffer.from(key, "hex");
  }

  encrypt(data: any): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);

    const serialized = JSON.stringify(data);
    let encrypted = cipher.update(serialized, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex")
    };
  }

  decrypt(encryptedData: EncryptedData): any {
    const decipher = crypto.createDecipher(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(encryptedData.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    let decrypted = decipher.update(encryptedData.data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  }
}
```

### 3. Audit Logging

```typescript
// security/audit.ts
class AuditLogger {
  private kg: KnowledgeGraphMemory;
  private logStorage: LogStorage;

  constructor(kg: KnowledgeGraphMemory, storage: LogStorage) {
    this.kg = kg;
    this.logStorage = storage;
  }

  async logOperation(
    agentId: string,
    operation: string,
    resource: string,
    result: OperationResult,
    context?: AuditContext
  ): Promise<void> {
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agentId,
      operation,
      resource,
      result: result.success ? "success" : "failure",
      error: result.error,
      context,
      metadata: {
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        sessionId: context?.sessionId
      }
    };

    await this.logStorage.store(auditEntry);

    // Alert on suspicious activities
    if (this.isSuspiciousActivity(auditEntry)) {
      await this.alertSecurityTeam(auditEntry);
    }
  }

  private isSuspiciousActivity(entry: AuditEntry): boolean {
    // Check for multiple failed attempts
    if (entry.result === "failure") {
      const recentFailures = this.getRecentFailures(entry.agentId, 300000); // 5 minutes
      if (recentFailures.length > 5) {
        return true;
      }
    }

    // Check for unusual access patterns
    if (entry.operation === "read_graph" && entry.context?.dataSize > 1000000) {
      return true; // Large data access
    }

    return false;
  }
}
```

## Monitoring and Observability

### 1. Metrics Collection

```typescript
// monitoring/metrics.ts
class MetricsCollector {
  private kg: KnowledgeGraphMemory;
  private metrics: Map<string, Metric>;
  private collectors: MetricCollector[];

  constructor(kg: KnowledgeGraphMemory) {
    this.kg = kg;
    this.metrics = new Map();
    this.collectors = [];
    this.setupDefaultMetrics();
  }

  private setupDefaultMetrics(): void {
    // System metrics
    this.addMetric("system.memory.usage", {
      type: "gauge",
      description: "Memory usage in bytes",
      collector: () => process.memoryUsage().heapUsed
    });

    this.addMetric("system.cpu.usage", {
      type: "gauge",
      description: "CPU usage percentage",
      collector: () => this.getCPUUsage()
    });

    // Collaboration metrics
    this.addMetric("collaboration.active_agents", {
      type: "gauge",
      description: "Number of active agents",
      collector: async () => {
        const agents = await this.kg.listActiveAgents();
        return agents.length;
      }
    });

    this.addMetric("collaboration.pending_tasks", {
      type: "gauge",
      description: "Number of pending tasks",
      collector: async () => {
        const tasks = await this.kg.getPendingTasks();
        return tasks.length;
      }
    });

    this.addMetric("collaboration.task_completion_rate", {
      type: "histogram",
      description: "Task completion time in milliseconds",
      buckets: [100, 500, 1000, 5000, 10000, 30000]
    });

    // Graph metrics
    this.addMetric("graph.entity_count", {
      type: "gauge",
      description: "Total number of entities",
      collector: async () => {
        const graph = await this.kg.readGraph();
        return graph.entities.length;
      }
    });

    this.addMetric("graph.relation_count", {
      type: "gauge",
      description: "Total number of relations",
      collector: async () => {
        const graph = await this.kg.readGraph();
        return graph.relations.length;
      }
    });
  }

  async collectMetrics(): Promise<MetricSnapshot[]> {
    const snapshots: MetricSnapshot[] = [];

    for (const [name, metric] of this.metrics) {
      try {
        const value = await metric.collector();
        snapshots.push({
          name,
          value,
          timestamp: Date.now(),
          type: metric.type,
          labels: metric.labels || {}
        });
      } catch (error) {
        console.error(`Failed to collect metric ${name}:`, error);
      }
    }

    return snapshots;
  }
}
```

### 2. Health Checks

```typescript
// monitoring/health.ts
class HealthChecker {
  private kg: KnowledgeGraphMemory;
  private checks: Map<string, HealthCheck>;

  constructor(kg: KnowledgeGraphMemory) {
    this.kg = kg;
    this.checks = new Map();
    this.setupDefaultChecks();
  }

  private setupDefaultChecks(): void {
    // Database connectivity
    this.addCheck("database", {
      name: "Database Connectivity",
      check: async () => {
        try {
          await this.kg.readGraph();
          return { status: "healthy", message: "Database accessible" };
        } catch (error) {
          return {
            status: "unhealthy",
            message: `Database error: ${error.message}`
          };
        }
      },
      timeout: 5000
    });

    // Agent collaboration
    this.addCheck("collaboration", {
      name: "Agent Collaboration",
      check: async () => {
        try {
          const agents = await this.kg.listActiveAgents();
          if (agents.length === 0) {
            return {
              status: "warning",
              message: "No active agents found"
            };
          }
          return {
            status: "healthy",
            message: `${agents.length} active agents`
          };
        } catch (error) {
          return {
            status: "unhealthy",
            message: `Collaboration error: ${error.message}`
          };
        }
      },
      timeout: 3000
    });

    // Memory usage
    this.addCheck("memory", {
      name: "Memory Usage",
      check: async () => {
        const usage = process.memoryUsage();
        const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;

        if (usagePercent > 90) {
          return {
            status: "unhealthy",
            message: `High memory usage: ${usagePercent.toFixed(1)}%`
          };
        } else if (usagePercent > 75) {
          return {
            status: "warning",
            message: `Elevated memory usage: ${usagePercent.toFixed(1)}%`
          };
        }

        return {
          status: "healthy",
          message: `Memory usage: ${usagePercent.toFixed(1)}%`
        };
      },
      timeout: 1000
    });
  }

  async runHealthChecks(): Promise<HealthReport> {
    const results: HealthCheckResult[] = [];
    let overallStatus: HealthStatus = "healthy";

    for (const [name, check] of this.checks) {
      try {
        const result = await Promise.race([
          check.check(),
          new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), check.timeout)
          )
        ]);

        results.push({ name: check.name, ...result });

        if (result.status === "unhealthy") {
          overallStatus = "unhealthy";
        } else if (result.status === "warning" && overallStatus === "healthy") {
          overallStatus = "warning";
        }
      } catch (error) {
        results.push({
          name: check.name,
          status: "unhealthy",
          message: `Check failed: ${error.message}`
        });
        overallStatus = "unhealthy";
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Agent Registration Failures

**Symptoms:**

- Agents fail to register with the system
- Registration timeouts
- Duplicate agent ID errors

**Diagnosis:**

```typescript
// Check agent registration status
const agents = await kg.listActiveAgents();
console.log("Active agents:", agents);

// Check for duplicate registrations
const duplicates = agents.filter(
  (agent, index, arr) => arr.findIndex((a) => a.id === agent.id) !== index
);

if (duplicates.length > 0) {
  console.log("Duplicate agents found:", duplicates);
}
```

**Solutions:**

1. Ensure unique agent IDs
2. Check network connectivity
3. Verify authentication credentials
4. Increase registration timeout

#### 2. Task Delegation Issues

**Symptoms:**

- Tasks remain in pending state
- No agents accept delegated tasks
- Task delegation timeouts

**Diagnosis:**

```typescript
// Check pending tasks
const pendingTasks = await kg.getPendingTasks();
console.log("Pending tasks:", pendingTasks);

// Check agent capabilities
for (const task of pendingTasks) {
  const suitableAgents = await kg.findAgentsByCapabilities(
    task.requiredCapabilities
  );
  console.log(`Task ${task.id} suitable agents:`, suitableAgents);
}
```

**Solutions:**

1. Verify agent capabilities match task requirements
2. Check agent availability and load
3. Review task priority and timeout settings
4. Ensure proper workflow configuration

#### 3. Performance Issues

**Symptoms:**

- Slow query responses
- High memory usage
- Task processing delays

**Diagnosis:**

```typescript
// Performance profiling
const startTime = Date.now();
const result = await kg.searchNodes({ query: "test" });
const duration = Date.now() - startTime;
console.log(`Query took ${duration}ms`);

// Memory usage check
const memUsage = process.memoryUsage();
console.log("Memory usage:", {
  heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
  heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
});
```

**Solutions:**

1. Enable caching for frequently accessed data
2. Optimize query patterns and indexing
3. Implement connection pooling
4. Use batch operations for bulk updates

#### 4. Data Consistency Issues

**Symptoms:**

- Inconsistent entity states across agents
- Missing relations or entities
- Synchronization conflicts

**Diagnosis:**

```typescript
// Data integrity check
const integrityReport = await debugHelper.validateIntegrity();
if (!integrityReport.isValid) {
  console.log("Integrity issues found:", integrityReport.issues);
}

// Check for orphaned data
const orphanedTasks = await kg.findOrphanedTasks();
const orphanedRelations = await kg.findOrphanedRelations();
```

**Solutions:**

1. Implement proper transaction handling
2. Use optimistic locking for concurrent updates
3. Regular data integrity checks
4. Implement conflict resolution strategies

### Debugging Tools

```typescript
// debugging/tools.ts
export class DebuggingTools {
  private kg: KnowledgeGraphMemory;

  constructor(kg: KnowledgeGraphMemory) {
    this.kg = kg;
  }

  async traceTaskExecution(taskId: string): Promise<TaskTrace> {
    const task = await this.kg.getTask(taskId);
    const events = await this.kg.getTaskEvents(taskId);
    const workflow = task.workflowId
      ? await this.kg.getWorkflow(task.workflowId)
      : null;

    return {
      task,
      events,
      workflow,
      timeline: this.buildTimeline(events),
      performance: this.analyzePerformance(events)
    };
  }

  async analyzeAgentPerformance(
    agentId: string
  ): Promise<AgentPerformanceReport> {
    const tasks = await this.kg.getAgentTasks(agentId);
    const completedTasks = tasks.filter((t) => t.status === "completed");

    const avgCompletionTime =
      completedTasks.reduce(
        (sum, task) => sum + (task.completedAt - task.createdAt),
        0
      ) / completedTasks.length;

    const successRate = completedTasks.length / tasks.length;

    return {
      agentId,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      successRate,
      avgCompletionTime,
      taskTypes: this.groupTasksByType(tasks),
      performanceTrend: await this.getPerformanceTrend(agentId)
    };
  }

  async generateSystemReport(): Promise<SystemReport> {
    const agents = await this.kg.listActiveAgents();
    const workflows = await this.kg.getActiveWorkflows();
    const tasks = await this.kg.getAllTasks();
    const graph = await this.kg.readGraph();

    return {
      timestamp: new Date().toISOString(),
      system: {
        agentCount: agents.length,
        workflowCount: workflows.length,
        taskCount: tasks.length,
        entityCount: graph.entities.length,
        relationCount: graph.relations.length
      },
      performance: await this.getSystemPerformance(),
      health: await this.getSystemHealth(),
      recommendations: await this.generateRecommendations()
    };
  }
}
```

## Common Integration Patterns

### 1. Request-Response Pattern

```typescript
// patterns/request-response.ts
class RequestResponsePattern {
  private kg: KnowledgeGraphMemory;

  constructor(kg: KnowledgeGraphMemory) {
    this.kg = kg;
  }

  async handleRequest(
    requesterId: string,
    request: ServiceRequest
  ): Promise<ServiceResponse> {
    // Create workflow for request processing
    const workflowId = await this.kg.createWorkflow({
      name: `Request Processing: ${request.type}`,
      description: `Process ${request.type} request from ${requesterId}`,
      participants: [requesterId]
    });

    try {
      // Find suitable agent for processing
      const processors = await this.kg.findAgentsByCapabilities(
        request.requiredCapabilities
      );

      if (processors.length === 0) {
        throw new Error("No suitable processors found");
      }

      // Select best processor based on load and performance
      const selectedProcessor = await this.selectBestProcessor(processors);

      // Delegate processing task
      const task = await this.kg.delegateTask({
        workflowId,
        taskType: "process_request",
        targetAgent: selectedProcessor.id,
        data: request.data,
        timeout: request.timeout || 30000
      });

      // Wait for completion
      const result = await this.waitForTaskCompletion(task.id, request.timeout);

      return {
        success: true,
        data: result.data,
        processingTime: result.completedAt - result.createdAt,
        processedBy: selectedProcessor.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        requestId: request.id
      };
    } finally {
      await this.kg.updateWorkflowStatus(workflowId, "completed");
    }
  }
}
```

### 2. Publish-Subscribe Pattern

```typescript
// patterns/pub-sub.ts
class PubSubPattern {
  private kg: KnowledgeGraphMemory;
  private subscriptions: Map<string, Subscription[]>;

  constructor(kg: KnowledgeGraphMemory) {
    this.kg = kg;
    this.subscriptions = new Map();
  }

  async subscribe(
    agentId: string,
    eventType: string,
    handler: EventHandler
  ): Promise<string> {
    const subscriptionId = crypto.randomUUID();

    const subscription: Subscription = {
      id: subscriptionId,
      agentId,
      eventType,
      handler,
      createdAt: Date.now()
    };

    const existing = this.subscriptions.get(eventType) || [];
    existing.push(subscription);
    this.subscriptions.set(eventType, existing);

    // Register with knowledge graph
    await this.kg.subscribeToEvents({
      agentId,
      eventTypes: [eventType],
      callback: this.handleEvent.bind(this)
    });

    return subscriptionId;
  }

  async publish(
    publisherId: string,
    eventType: string,
    data: any,
    metadata?: EventMetadata
  ): Promise<void> {
    const event: CollaborationEvent = {
      id: crypto.randomUUID(),
      type: eventType,
      publisherId,
      data,
      metadata: {
        timestamp: Date.now(),
        ...metadata
      }
    };

    // Publish to knowledge graph
    await this.kg.publishEvent(event);

    // Notify local subscribers
    const subscribers = this.subscriptions.get(eventType) || [];

    await Promise.all(
      subscribers.map(async (subscription) => {
        try {
          await subscription.handler(event);
        } catch (error) {
          console.error(
            `Error in event handler for ${subscription.agentId}:`,
            error
          );
        }
      })
    );
  }

  private async handleEvent(event: CollaborationEvent): Promise<void> {
    const subscribers = this.subscriptions.get(event.type) || [];

    for (const subscription of subscribers) {
      try {
        await subscription.handler(event);
      } catch (error) {
        console.error(
          `Error handling event ${event.id} for agent ${subscription.agentId}:`,
          error
        );
      }
    }
  }
}
```

### 3. Circuit Breaker Pattern

```typescript
// patterns/circuit-breaker.ts
class CircuitBreaker {
  private kg: KnowledgeGraphMemory;
  private state: CircuitState;
  private failureCount: number;
  private lastFailureTime: number;
  private config: CircuitBreakerConfig;

  constructor(kg: KnowledgeGraphMemory, config: CircuitBreakerConfig) {
    this.kg = kg;
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.config = config;
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = "half-open";
      } else {
        if (fallback) {
          return await fallback();
        }
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback) {
        return await fallback();
      }

      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "open";
    }
  }
}
```

## Testing Strategies

### 1. Unit Testing

```typescript
// tests/unit/knowledge-graph.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeGraphMemory } from "../../src/index";

describe("KnowledgeGraphMemory", () => {
  let kg: KnowledgeGraphMemory;

  beforeEach(() => {
    kg = new KnowledgeGraphMemory({
      storage: { type: "memory" }
    });
  });

  describe("Entity Management", () => {
    it("should create entities successfully", async () => {
      const entity = {
        name: "Test Entity",
        entityType: "test",
        observations: ["Test observation"]
      };

      const result = await kg.createEntity(entity);

      expect(result).toBeDefined();
      expect(result.name).toBe(entity.name);
      expect(result.entityType).toBe(entity.entityType);
    });

    it("should handle duplicate entity names", async () => {
      const entity = {
        name: "Duplicate Entity",
        entityType: "test",
        observations: ["Test"]
      };

      await kg.createEntity(entity);

      await expect(kg.createEntity(entity)).rejects.toThrow(
        'Entity with name "Duplicate Entity" already exists'
      );
    });
  });

  describe("Search Functionality", () => {
    beforeEach(async () => {
      await kg.createEntity({
        name: "Searchable Entity",
        entityType: "searchable",
        observations: ["This is searchable content"]
      });
    });

    it("should find entities by query", async () => {
      const results = await kg.searchNodes({
        query: "searchable"
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Searchable Entity");
    });

    it("should support fuzzy matching", async () => {
      const results = await kg.searchNodes({
        query: "searchabl", // Missing 'e'
        fuzzyMatch: true
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
```

### 2. Integration Testing

```typescript
// tests/integration/collaboration.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnowledgeGraphMemory } from "../../src/index";
import { TestAgent } from "../helpers/test-agent";

describe("Agent Collaboration Integration", () => {
  let coordinator: KnowledgeGraphMemory;
  let processor: KnowledgeGraphMemory;
  let validator: KnowledgeGraphMemory;

  beforeEach(async () => {
    // Setup test environment with multiple agents
    coordinator = new KnowledgeGraphMemory({
      storage: { type: "memory" },
      collaboration: {
        enabled: true,
        agentId: "coordinator"
      }
    });

    processor = new KnowledgeGraphMemory({
      storage: { type: "memory" },
      collaboration: {
        enabled: true,
        agentId: "processor"
      }
    });

    validator = new KnowledgeGraphMemory({
      storage: { type: "memory" },
      collaboration: {
        enabled: true,
        agentId: "validator"
      }
    });

    // Register agents
    await coordinator.registerAgent({
      id: "coordinator",
      capabilities: ["coordination", "workflow-management"]
    });

    await processor.registerAgent({
      id: "processor",
      capabilities: ["data-processing"]
    });

    await validator.registerAgent({
      id: "validator",
      capabilities: ["data-validation"]
    });

    // Start collaboration
    await Promise.all([
      coordinator.startCollaboration(),
      processor.startCollaboration(),
      validator.startCollaboration()
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      coordinator.stopCollaboration(),
      processor.stopCollaboration(),
      validator.stopCollaboration()
    ]);
  });

  it("should coordinate multi-agent workflow", async () => {
    // Create collaborative workflow
    const workflowId = await coordinator.createCollaborativeWorkflow({
      name: "Data Processing Pipeline",
      stages: [
        {
          name: "validation",
          requiredCapabilities: ["data-validation"],
          dependencies: []
        },
        {
          name: "processing",
          requiredCapabilities: ["data-processing"],
          dependencies: ["validation"]
        }
      ]
    });

    // Assign validation task
    const validationTask = await coordinator.assignTaskToAgent({
      workflowId,
      taskType: "validation",
      targetAgent: "validator",
      data: { input: "test data" }
    });

    // Validator accepts and completes task
    await validator.acceptTask(validationTask.id);
    await validator.completeTask(validationTask.id, {
      result: "validated",
      output: "validated test data"
    });

    // Assign processing task
    const processingTask = await coordinator.assignTaskToAgent({
      workflowId,
      taskType: "processing",
      targetAgent: "processor",
      data: { input: "validated test data" }
    });

    // Processor accepts and completes task
    await processor.acceptTask(processingTask.id);
    await processor.completeTask(processingTask.id, {
      result: "processed",
      output: "processed validated test data"
    });

    // Verify workflow completion
    const workflow = await coordinator.getWorkflow(workflowId);
    expect(workflow.status).toBe("completed");

    const tasks = await coordinator.getWorkflowTasks(workflowId);
    expect(tasks.every((task) => task.status === "completed")).toBe(true);
  });
});
```

### 3. Performance Testing

```typescript
// tests/performance/load.test.ts
import { describe, it, expect } from "vitest";
import { KnowledgeGraphMemory } from "../../src/index";
import { PerformanceProfiler } from "../helpers/performance-profiler";

describe("Performance Tests", () => {
  it("should handle high entity creation load", async () => {
    const kg = new KnowledgeGraphMemory({
      storage: { type: "memory" },
      performance: {
        batchSize: 100,
        cacheSize: 1000
      }
    });

    const profiler = new PerformanceProfiler();
    const entityCount = 10000;

    profiler.start("entity-creation");

    const promises = [];
    for (let i = 0; i < entityCount; i++) {
      promises.push(
        kg.createEntity({
          name: `Entity ${i}`,
          entityType: "performance-test",
          observations: [`Observation for entity ${i}`]
        })
      );
    }

    await Promise.all(promises);

    const duration = profiler.end("entity-creation");
    const throughput = entityCount / (duration / 1000); // entities per second

    expect(throughput).toBeGreaterThan(1000); // At least 1000 entities/sec
    expect(duration).toBeLessThan(10000); // Less than 10 seconds
  });

  it("should maintain search performance with large datasets", async () => {
    const kg = new KnowledgeGraphMemory({
      storage: { type: "memory" },
      performance: {
        indexingEnabled: true,
        cacheSize: 5000
      }
    });

    // Create large dataset
    const entityCount = 50000;
    const entities = Array.from({ length: entityCount }, (_, i) => ({
      name: `Entity ${i}`,
      entityType: "search-test",
      observations: [
        `This is entity number ${i}`,
        `Category: ${i % 10}`,
        `Priority: ${i % 3 === 0 ? "high" : "normal"}`
      ]
    }));

    await kg.batchCreateEntities(entities);

    // Test search performance
    const profiler = new PerformanceProfiler();
    const searchQueries = [
      "Entity 12345",
      "Category: 5",
      "Priority: high",
      "number 999"
    ];

    for (const query of searchQueries) {
      profiler.start(`search-${query}`);

      const results = await kg.searchNodes({ query });

      const duration = profiler.end(`search-${query}`);

      expect(duration).toBeLessThan(100); // Less than 100ms
      expect(results.length).toBeGreaterThan(0);
    }
  });
});
```

### 4. End-to-End Testing

```typescript
// tests/e2e/workflow.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { KnowledgeGraphMemory } from "../../src/index";
import { TestEnvironment } from "../helpers/test-environment";

describe("End-to-End Workflow Tests", () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  it("should complete complex multi-agent workflow", async () => {
    const { coordinator, agents } = testEnv;

    // Create complex workflow with multiple stages
    const workflowId = await coordinator.createCollaborativeWorkflow({
      name: "Complex Data Pipeline",
      description: "Multi-stage data processing with validation and analysis",
      stages: [
        {
          name: "data-ingestion",
          requiredCapabilities: ["data-ingestion"],
          parallelism: 3
        },
        {
          name: "data-validation",
          requiredCapabilities: ["data-validation"],
          dependencies: ["data-ingestion"]
        },
        {
          name: "data-processing",
          requiredCapabilities: ["data-processing"],
          dependencies: ["data-validation"],
          parallelism: 2
        },
        {
          name: "data-analysis",
          requiredCapabilities: ["data-analysis"],
          dependencies: ["data-processing"]
        },
        {
          name: "report-generation",
          requiredCapabilities: ["reporting"],
          dependencies: ["data-analysis"]
        }
      ]
    });

    // Execute workflow
    const result = await coordinator.executeWorkflow(workflowId, {
      input: {
        dataSources: ["source1", "source2", "source3"],
        processingOptions: {
          validation: "strict",
          analysis: "comprehensive"
        }
      },
      timeout: 300000 // 5 minutes
    });

    // Verify results
    expect(result.success).toBe(true);
    expect(result.stages).toHaveLength(5);
    expect(result.stages.every((stage) => stage.status === "completed")).toBe(
      true
    );

    // Verify data flow
    const workflowData = await coordinator.getWorkflowData(workflowId);
    expect(workflowData.stages["report-generation"].output).toBeDefined();
  });
});
```

## Deployment Considerations

### 1. Container Deployment

```dockerfile
# Dockerfile
FROM oven/bun:1.0-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build application
RUN bun run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S agent -u 1001

# Set permissions
RUN chown -R agent:nodejs /app
USER agent

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run health-check

# Start application
CMD ["bun", "run", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  knowledge-graph:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/kg
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=kg
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  grafana_data:
```

### 2. Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: knowledge-graph-memory
  labels:
    app: knowledge-graph-memory
spec:
  replicas: 3
  selector:
    matchLabels:
      app: knowledge-graph-memory
  template:
    metadata:
      labels:
        app: knowledge-graph-memory
    spec:
      containers:
        - name: knowledge-graph-memory
          image: knowledge-graph-memory:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: kg-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: kg-secrets
                  key: redis-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: knowledge-graph-memory-service
spec:
  selector:
    app: knowledge-graph-memory
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Agent Collaboration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test

      - name: Run integration tests
        run: bun test:integration

      - name: Run performance tests
        run: bun test:performance

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t knowledge-graph-memory:${{ github.sha }} .
          docker tag knowledge-graph-memory:${{ github.sha }} knowledge-graph-memory:latest

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push knowledge-graph-memory:${{ github.sha }}
          docker push knowledge-graph-memory:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/knowledge-graph-memory \
            knowledge-graph-memory=knowledge-graph-memory:${{ github.sha }}
          kubectl rollout status deployment/knowledge-graph-memory
```

## Migration Guide

### Migrating from Version 1.x to 2.x

```typescript
// migration/v1-to-v2.ts
class MigrationV1ToV2 {
  private oldKg: KnowledgeGraphMemoryV1;
  private newKg: KnowledgeGraphMemoryV2;

  constructor(oldConfig: V1Config, newConfig: V2Config) {
    this.oldKg = new KnowledgeGraphMemoryV1(oldConfig);
    this.newKg = new KnowledgeGraphMemoryV2(newConfig);
  }

  async migrate(): Promise<MigrationResult> {
    const migrationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // 1. Export data from v1
      console.log("Exporting data from v1...");
      const v1Data = await this.exportV1Data();

      // 2. Transform data structure
      console.log("Transforming data structure...");
      const v2Data = await this.transformData(v1Data);

      // 3. Import into v2
      console.log("Importing into v2...");
      await this.importV2Data(v2Data);

      // 4. Verify migration
      console.log("Verifying migration...");
      const verification = await this.verifyMigration(v1Data, v2Data);

      if (!verification.success) {
        throw new Error(
          `Migration verification failed: ${verification.errors.join(", ")}`
        );
      }

      return {
        success: true,
        migrationId,
        duration: Date.now() - startTime,
        entitiesMigrated: v2Data.entities.length,
        relationsMigrated: v2Data.relations.length
      };
    } catch (error) {
      return {
        success: false,
        migrationId,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async exportV1Data(): Promise<V1Data> {
    const entities = await this.oldKg.getAllEntities();
    const relations = await this.oldKg.getAllRelations();
    const metadata = await this.oldKg.getMetadata();

    return { entities, relations, metadata };
  }

  private async transformData(v1Data: V1Data): Promise<V2Data> {
    // Transform entities
    const entities = v1Data.entities.map((entity) => ({
      ...entity,
      // Add new v2 fields
      metadata: {
        ...entity.metadata,
        version: "2.0",
        migrated: true,
        originalId: entity.id
      },
      // Transform observations to new format
      observations: entity.observations.map((obs) => ({
        content: obs,
        timestamp: Date.now(),
        source: "migration"
      }))
    }));

    // Transform relations
    const relations = v1Data.relations.map((relation) => ({
      ...relation,
      metadata: {
        ...relation.metadata,
        version: "2.0",
        migrated: true
      }
    }));

    return { entities, relations, metadata: v1Data.metadata };
  }
}
```

### Database Schema Migration

```sql
-- migration/schema-v2.sql
-- Add new columns for v2 features
ALTER TABLE entities ADD COLUMN metadata_v2 JSONB;
ALTER TABLE entities ADD COLUMN version VARCHAR(10) DEFAULT '2.0';
ALTER TABLE entities ADD COLUMN migrated_at TIMESTAMP DEFAULT NOW();

-- Create new tables for collaboration features
CREATE TABLE agents (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capabilities TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflows (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  participants TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) REFERENCES workflows(id),
  task_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to VARCHAR(255) REFERENCES agents(id),
  data JSONB,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_entities_type ON entities(entity_type);
CREATE INDEX idx_entities_metadata ON entities USING GIN(metadata_v2);
CREATE INDEX idx_agents_capabilities ON agents USING GIN(capabilities);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_workflow ON tasks(workflow_id);
```

## Conclusion

This integration guide provides comprehensive guidance for implementing and
optimizing the Agent Collaboration system with agent collaboration capabilities.
Key takeaways:

1. **Start Simple**: Begin with basic integration and gradually add
   collaboration features
2. **Monitor Performance**: Implement comprehensive monitoring from day one
3. **Security First**: Apply security best practices throughout the integration
4. **Test Thoroughly**: Use multiple testing strategies to ensure reliability
5. **Plan for Scale**: Design with scalability and performance in mind
6. **Document Everything**: Maintain clear documentation for troubleshooting and
   maintenance

For additional support and advanced use cases, refer to the API documentation
and community resources.

---

_Last updated: $(date)_ _Version: 2.0.0_
