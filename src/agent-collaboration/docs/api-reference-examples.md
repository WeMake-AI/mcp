# API Reference and Examples

Comprehensive API reference documentation for the Agent Collaboration system
with agent collaboration capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Core MCP Tools](#core-mcp-tools)
3. [Agent Management API](#agent-management-api)
4. [Task Delegation API](#task-delegation-api)
5. [Resource Sharing API](#resource-sharing-api)
6. [Communication API](#communication-api)
7. [Query and Search API](#query-and-search-api)
8. [Workflow Coordination API](#workflow-coordination-api)
9. [Error Handling](#error-handling)
10. [Code Examples](#code-examples)
11. [SDK Integration](#sdk-integration)

## Overview

The Agent Collaboration system provides a comprehensive set of MCP (Model
Context Protocol) tools for agent collaboration. This reference documents all
available tools with detailed parameters, return values, and usage examples.

### Base Configuration

```typescript
// Basic MCP server configuration
interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
  };
  tools: MCPTool[];
}

// Standard response format
interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: number;
    requestId: string;
    executionTime: number;
  };
}
```

## Core MCP Tools

### Knowledge Graph Operations

#### `create_entities`

Creates multiple new entities in the knowledge graph.

**Parameters:**

```typescript
interface CreateEntitiesParams {
  entities: {
    name: string;
    entityType: string;
    observations: string[];
    metadata?: Record<string, any>;
  }[];
}
```

**Response:**

```typescript
interface CreateEntitiesResponse {
  created: {
    id: string;
    name: string;
    entityType: string;
  }[];
  errors?: {
    entity: string;
    error: string;
  }[];
}
```

**Example:**

```typescript
// Create multiple entities for agent collaboration
const result = await mcpClient.call("create_entities", {
  entities: [
    {
      name: "DataProcessingAgent",
      entityType: "agent",
      observations: [
        "Specialized in data processing and transformation",
        "Supports CSV, JSON, and XML formats",
        "Can handle up to 10GB datasets"
      ],
      metadata: {
        capabilities: ["data-processing", "transformation"],
        version: "2.1.0",
        status: "active"
      }
    },
    {
      name: "ValidationWorkflow",
      entityType: "workflow",
      observations: [
        "Multi-stage data validation process",
        "Includes schema validation and data quality checks"
      ],
      metadata: {
        stages: ["schema-check", "quality-check", "completeness-check"],
        estimatedDuration: 300
      }
    }
  ]
});

console.log(`Created ${result.data.created.length} entities`);
```

#### `create_relations`

Establishes relationships between entities.

**Parameters:**

```typescript
interface CreateRelationsParams {
  relations: {
    from: string;
    to: string;
    relationType: string;
    metadata?: Record<string, any>;
  }[];
}
```

**Example:**

```typescript
// Create agent-workflow relationships
const relations = await mcpClient.call("create_relations", {
  relations: [
    {
      from: "DataProcessingAgent",
      to: "ValidationWorkflow",
      relationType: "executes",
      metadata: {
        priority: "high",
        estimatedTime: 120
      }
    },
    {
      from: "ValidationWorkflow",
      to: "QualityReport",
      relationType: "produces",
      metadata: {
        outputFormat: "json"
      }
    }
  ]
});
```

#### `search_nodes`

Searches for entities and relations in the knowledge graph.

**Parameters:**

```typescript
interface SearchNodesParams {
  query: string;
  filters?: {
    entityType?: string[];
    relationType?: string[];
    metadata?: Record<string, any>;
  };
  options?: {
    limit?: number;
    offset?: number;
    includeRelations?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}
```

**Example:**

```typescript
// Search for active agents with specific capabilities
const searchResult = await mcpClient.call("search_nodes", {
  query: "data processing",
  filters: {
    entityType: ["agent"],
    metadata: {
      status: "active",
      capabilities: { $contains: "data-processing" }
    }
  },
  options: {
    limit: 10,
    includeRelations: true,
    sortBy: "metadata.version",
    sortOrder: "desc"
  }
});

console.log(`Found ${searchResult.data.entities.length} matching agents`);
```

## Agent Management API

### `register_agent`

Registers a new agent in the collaboration system.

**Parameters:**

```typescript
interface RegisterAgentParams {
  agentId: string;
  name: string;
  description?: string;
  capabilities: string[];
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
    configuration?: Record<string, any>;
  };
  endpoints?: {
    health?: string;
    metrics?: string;
    control?: string;
  };
}
```

**Response:**

```typescript
interface RegisterAgentResponse {
  agentId: string;
  registrationToken: string;
  status: "registered" | "pending" | "rejected";
  assignedCapabilities: string[];
  discoveryInfo: {
    networkAddress: string;
    port: number;
    protocol: string;
  };
}
```

**Example:**

```typescript
// Register a new data analysis agent
const registration = await mcpClient.call("register_agent", {
  agentId: "analysis-agent-001",
  name: "Advanced Data Analysis Agent",
  description: "Performs statistical analysis and machine learning tasks",
  capabilities: [
    "statistical-analysis",
    "machine-learning",
    "data-visualization",
    "report-generation"
  ],
  metadata: {
    version: "3.2.1",
    author: "DataTeam",
    tags: ["analytics", "ml", "statistics"],
    configuration: {
      maxConcurrentTasks: 5,
      supportedFormats: ["csv", "json", "parquet"],
      memoryLimit: "8GB"
    }
  },
  endpoints: {
    health: "http://analysis-agent:8080/health",
    metrics: "http://analysis-agent:8080/metrics",
    control: "http://analysis-agent:8080/control"
  }
});

console.log(
  `Agent registered with token: ${registration.data.registrationToken}`
);
```

### `discover_agents`

Discovers available agents based on capabilities and filters.

**Parameters:**

```typescript
interface DiscoverAgentsParams {
  requiredCapabilities?: string[];
  optionalCapabilities?: string[];
  filters?: {
    status?: "active" | "inactive" | "busy" | "error";
    tags?: string[];
    version?: string;
    availability?: {
      minConcurrentTasks?: number;
      maxResponseTime?: number;
    };
  };
  options?: {
    includeMetrics?: boolean;
    includeCapabilityDetails?: boolean;
    sortBy?: "availability" | "performance" | "compatibility";
  };
}
```

**Example:**

```typescript
// Discover agents for data processing workflow
const agents = await mcpClient.call("discover_agents", {
  requiredCapabilities: ["data-processing"],
  optionalCapabilities: ["data-validation", "error-handling"],
  filters: {
    status: "active",
    availability: {
      minConcurrentTasks: 2,
      maxResponseTime: 5000
    }
  },
  options: {
    includeMetrics: true,
    sortBy: "performance"
  }
});

// Select best agent for the task
const bestAgent = agents.data.agents[0];
console.log(`Selected agent: ${bestAgent.name} (${bestAgent.agentId})`);
```

### `update_agent_status`

Updates an agent's status and metadata.

**Parameters:**

```typescript
interface UpdateAgentStatusParams {
  agentId: string;
  status: "active" | "inactive" | "busy" | "error" | "maintenance";
  metadata?: {
    currentTasks?: number;
    lastActivity?: number;
    performance?: {
      averageResponseTime: number;
      successRate: number;
      throughput: number;
    };
    health?: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
    };
  };
  message?: string;
}
```

**Example:**

```typescript
// Update agent status with performance metrics
const statusUpdate = await mcpClient.call("update_agent_status", {
  agentId: "analysis-agent-001",
  status: "active",
  metadata: {
    currentTasks: 3,
    lastActivity: Date.now(),
    performance: {
      averageResponseTime: 1250,
      successRate: 0.98,
      throughput: 45.2
    },
    health: {
      cpuUsage: 0.65,
      memoryUsage: 0.72,
      diskUsage: 0.45
    }
  },
  message: "Processing data analysis tasks efficiently"
});
```

## Task Delegation API

### `create_task`

Creates a new task for agent execution.

**Parameters:**

```typescript
interface CreateTaskParams {
  taskType: string;
  description: string;
  requiredCapabilities: string[];
  priority: "low" | "medium" | "high" | "critical";
  data: {
    input: any;
    parameters?: Record<string, any>;
    constraints?: {
      timeout?: number;
      maxRetries?: number;
      resourceLimits?: {
        memory?: string;
        cpu?: string;
        storage?: string;
      };
    };
  };
  dependencies?: string[];
  metadata?: Record<string, any>;
}
```

**Response:**

```typescript
interface CreateTaskResponse {
  taskId: string;
  status: "pending" | "assigned" | "running" | "completed" | "failed";
  assignedAgent?: string;
  estimatedCompletion?: number;
  queuePosition?: number;
}
```

**Example:**

```typescript
// Create a complex data analysis task
const task = await mcpClient.call("create_task", {
  taskType: "data-analysis",
  description: "Perform comprehensive statistical analysis on customer data",
  requiredCapabilities: ["statistical-analysis", "data-visualization"],
  priority: "high",
  data: {
    input: {
      dataSource: "s3://data-bucket/customer-data.csv",
      schema: {
        customerId: "string",
        age: "number",
        purchaseAmount: "number",
        category: "string"
      }
    },
    parameters: {
      analysisType: "comprehensive",
      includeCorrelations: true,
      generateVisualizations: true,
      outputFormat: "pdf"
    },
    constraints: {
      timeout: 1800000, // 30 minutes
      maxRetries: 2,
      resourceLimits: {
        memory: "4GB",
        cpu: "2 cores"
      }
    }
  },
  metadata: {
    requestedBy: "marketing-team",
    deadline: Date.now() + 3600000, // 1 hour from now
    confidentiality: "internal"
  }
});

console.log(`Task created with ID: ${task.data.taskId}`);
```

### `assign_task`

Assigns a task to a specific agent.

**Parameters:**

```typescript
interface AssignTaskParams {
  taskId: string;
  agentId: string;
  priority?: "low" | "medium" | "high" | "critical";
  deadline?: number;
  metadata?: Record<string, any>;
}
```

**Example:**

```typescript
// Assign task to best available agent
const assignment = await mcpClient.call("assign_task", {
  taskId: "task-12345",
  agentId: "analysis-agent-001",
  priority: "high",
  deadline: Date.now() + 1800000, // 30 minutes
  metadata: {
    assignmentReason: "best-performance-match",
    expectedDuration: 900000 // 15 minutes
  }
});
```

### `get_task_status`

Retrieves the current status and progress of a task.

**Parameters:**

```typescript
interface GetTaskStatusParams {
  taskId: string;
  includeProgress?: boolean;
  includeLogs?: boolean;
  includeMetrics?: boolean;
}
```

**Response:**

```typescript
interface GetTaskStatusResponse {
  taskId: string;
  status:
    | "pending"
    | "assigned"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  assignedAgent?: string;
  progress?: {
    percentage: number;
    currentStage: string;
    estimatedTimeRemaining: number;
    stagesCompleted: string[];
    stagesRemaining: string[];
  };
  result?: any;
  error?: {
    code: string;
    message: string;
    details: any;
  };
  metrics?: {
    startTime: number;
    endTime?: number;
    duration?: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
  logs?: {
    timestamp: number;
    level: "debug" | "info" | "warn" | "error";
    message: string;
    metadata?: any;
  }[];
}
```

**Example:**

```typescript
// Monitor task progress
const status = await mcpClient.call("get_task_status", {
  taskId: "task-12345",
  includeProgress: true,
  includeLogs: true,
  includeMetrics: true
});

if (status.data.status === "running") {
  console.log(`Task progress: ${status.data.progress.percentage}%`);
  console.log(`Current stage: ${status.data.progress.currentStage}`);
  console.log(`ETA: ${status.data.progress.estimatedTimeRemaining}ms`);
} else if (status.data.status === "completed") {
  console.log("Task completed successfully!");
  console.log("Result:", status.data.result);
}
```

## Resource Sharing API

### `share_resource`

Shares a resource with other agents or workflows.

**Parameters:**

```typescript
interface ShareResourceParams {
  resourceId: string;
  resourceType: "data" | "model" | "configuration" | "result" | "artifact";
  content: any;
  permissions: {
    read: string[]; // Agent IDs or 'all'
    write?: string[];
    execute?: string[];
  };
  metadata?: {
    description?: string;
    tags?: string[];
    version?: string;
    expiresAt?: number;
    size?: number;
    format?: string;
  };
  options?: {
    encrypted?: boolean;
    compressed?: boolean;
    cacheable?: boolean;
    replicationFactor?: number;
  };
}
```

**Example:**

```typescript
// Share processed dataset with analysis agents
const sharedResource = await mcpClient.call("share_resource", {
  resourceId: "processed-customer-data-v2",
  resourceType: "data",
  content: {
    location: "s3://shared-bucket/processed-data.parquet",
    schema: {
      customerId: "string",
      segment: "string",
      lifetimeValue: "number",
      riskScore: "number"
    },
    recordCount: 150000
  },
  permissions: {
    read: ["analysis-agent-001", "ml-agent-002", "reporting-agent-003"],
    write: ["data-processing-agent-001"]
  },
  metadata: {
    description: "Customer data processed with segmentation and risk scoring",
    tags: ["customer-data", "processed", "segmented"],
    version: "2.1.0",
    expiresAt: Date.now() + 86400000, // 24 hours
    size: 45000000, // 45MB
    format: "parquet"
  },
  options: {
    encrypted: true,
    compressed: true,
    cacheable: true,
    replicationFactor: 2
  }
});
```

### `get_shared_resources`

Retrieves available shared resources.

**Parameters:**

```typescript
interface GetSharedResourcesParams {
  filters?: {
    resourceType?: string[];
    tags?: string[];
    sharedBy?: string;
    permissions?: "read" | "write" | "execute";
  };
  options?: {
    includeExpired?: boolean;
    sortBy?: "created" | "modified" | "size" | "popularity";
    limit?: number;
    offset?: number;
  };
}
```

**Example:**

```typescript
// Find available datasets for analysis
const resources = await mcpClient.call("get_shared_resources", {
  filters: {
    resourceType: ["data"],
    tags: ["customer-data"],
    permissions: "read"
  },
  options: {
    includeExpired: false,
    sortBy: "modified",
    limit: 20
  }
});

for (const resource of resources.data.resources) {
  console.log(
    `Available: ${resource.resourceId} (${resource.metadata.size} bytes)`
  );
}
```

### `lock_resource`

Acquires an exclusive lock on a shared resource.

**Parameters:**

```typescript
interface LockResourceParams {
  resourceId: string;
  lockType: "read" | "write" | "exclusive";
  duration?: number; // Lock duration in milliseconds
  metadata?: {
    reason?: string;
    operation?: string;
  };
}
```

**Example:**

```typescript
// Lock resource for exclusive write access
const lock = await mcpClient.call("lock_resource", {
  resourceId: "shared-model-v1",
  lockType: "exclusive",
  duration: 300000, // 5 minutes
  metadata: {
    reason: "model-update",
    operation: "parameter-tuning"
  }
});

if (lock.data.acquired) {
  console.log(`Lock acquired: ${lock.data.lockId}`);
  // Perform exclusive operations

  // Release lock when done
  await mcpClient.call("unlock_resource", {
    resourceId: "shared-model-v1",
    lockId: lock.data.lockId
  });
}
```

## Communication API

### `send_agent_message`

Sends a direct message to another agent.

**Parameters:**

```typescript
interface SendAgentMessageParams {
  recipientId: string;
  messageType: "request" | "response" | "notification" | "alert";
  content: {
    subject?: string;
    body: any;
    attachments?: {
      name: string;
      type: string;
      content: any;
    }[];
  };
  priority: "low" | "medium" | "high" | "urgent";
  metadata?: {
    correlationId?: string;
    replyTo?: string;
    expiresAt?: number;
  };
}
```

**Example:**

```typescript
// Send task completion notification
const message = await mcpClient.call("send_agent_message", {
  recipientId: "coordinator-agent",
  messageType: "notification",
  content: {
    subject: "Task Completion Notification",
    body: {
      taskId: "task-12345",
      status: "completed",
      result: {
        analysisComplete: true,
        insights: 15,
        recommendations: 8,
        confidence: 0.94
      },
      metrics: {
        duration: 847000,
        resourcesUsed: {
          cpu: "2.3 core-hours",
          memory: "3.2 GB-hours"
        }
      }
    },
    attachments: [
      {
        name: "analysis-report.pdf",
        type: "application/pdf",
        content: "base64-encoded-pdf-content"
      }
    ]
  },
  priority: "medium",
  metadata: {
    correlationId: "workflow-789",
    replyTo: "analysis-agent-001"
  }
});
```

### `create_communication_channel`

Creates a communication channel for group messaging.

**Parameters:**

```typescript
interface CreateCommunicationChannelParams {
  channelId: string;
  name: string;
  description?: string;
  type: "broadcast" | "discussion" | "notification" | "workflow";
  participants: string[];
  permissions?: {
    canPost: string[];
    canRead: string[];
    canManage: string[];
  };
  settings?: {
    persistent?: boolean;
    encrypted?: boolean;
    maxMessages?: number;
    retentionPeriod?: number;
  };
}
```

**Example:**

```typescript
// Create workflow coordination channel
const channel = await mcpClient.call("create_communication_channel", {
  channelId: "data-pipeline-workflow",
  name: "Data Pipeline Coordination",
  description: "Coordination channel for data processing pipeline",
  type: "workflow",
  participants: [
    "ingestion-agent-001",
    "processing-agent-002",
    "validation-agent-003",
    "output-agent-004",
    "coordinator-agent"
  ],
  permissions: {
    canPost: ["all"],
    canRead: ["all"],
    canManage: ["coordinator-agent"]
  },
  settings: {
    persistent: true,
    encrypted: false,
    maxMessages: 1000,
    retentionPeriod: 604800000 // 7 days
  }
});
```

### `publish_event`

Publishes an event to the event system.

**Parameters:**

```typescript
interface PublishEventParams {
  eventType: string;
  source: string;
  data: any;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    version?: string;
    tags?: string[];
  };
  routing?: {
    targets?: string[];
    filters?: Record<string, any>;
    priority?: "low" | "medium" | "high" | "critical";
  };
}
```

**Example:**

```typescript
// Publish workflow stage completion event
const event = await mcpClient.call("publish_event", {
  eventType: "workflow.stage.completed",
  source: "processing-agent-002",
  data: {
    workflowId: "data-pipeline-789",
    stageId: "data-transformation",
    status: "completed",
    output: {
      recordsProcessed: 150000,
      recordsValid: 148500,
      recordsInvalid: 1500,
      outputLocation: "s3://processed-data/batch-20241201.parquet"
    },
    metrics: {
      duration: 1250000,
      throughput: 120.5,
      errorRate: 0.01
    }
  },
  metadata: {
    correlationId: "pipeline-execution-456",
    version: "1.0",
    tags: ["data-processing", "transformation", "batch"]
  },
  routing: {
    targets: ["validation-agent-003", "coordinator-agent"],
    priority: "medium"
  }
});
```

## Query and Search API

### `search_by_agent`

Searches for entities and relations associated with specific agents.

**Parameters:**

```typescript
interface SearchByAgentParams {
  agentId: string;
  query?: string;
  filters?: {
    entityType?: string[];
    relationType?: string[];
    timeRange?: {
      start: number;
      end: number;
    };
  };
  options?: {
    includeCreated?: boolean;
    includeModified?: boolean;
    includeAccessed?: boolean;
    limit?: number;
    sortBy?: "relevance" | "created" | "modified";
  };
}
```

**Example:**

```typescript
// Search for all entities created by a specific agent
const agentEntities = await mcpClient.call("search_by_agent", {
  agentId: "analysis-agent-001",
  filters: {
    entityType: ["result", "insight", "recommendation"],
    timeRange: {
      start: Date.now() - 86400000, // Last 24 hours
      end: Date.now()
    }
  },
  options: {
    includeCreated: true,
    includeModified: true,
    limit: 50,
    sortBy: "created"
  }
});

console.log(
  `Found ${agentEntities.data.entities.length} entities created by agent`
);
```

### `search_by_workflow`

Searches for entities and relations within a specific workflow context.

**Parameters:**

```typescript
interface SearchByWorkflowParams {
  workflowId: string;
  query?: string;
  filters?: {
    stage?: string;
    status?: string[];
    entityType?: string[];
  };
  options?: {
    includeIntermediateResults?: boolean;
    includeFinalResults?: boolean;
    includeMetrics?: boolean;
    groupByStage?: boolean;
  };
}
```

**Example:**

```typescript
// Search for all results in a workflow
const workflowResults = await mcpClient.call("search_by_workflow", {
  workflowId: "data-pipeline-789",
  filters: {
    status: ["completed"],
    entityType: ["result", "output"]
  },
  options: {
    includeIntermediateResults: true,
    includeFinalResults: true,
    includeMetrics: true,
    groupByStage: true
  }
});

// Process results by stage
for (const [stage, results] of Object.entries(
  workflowResults.data.resultsByStage
)) {
  console.log(`Stage ${stage}: ${results.length} results`);
}
```

## Workflow Coordination API

### `create_collaborative_workflow`

Creates a new collaborative workflow with multiple agents.

**Parameters:**

```typescript
interface CreateCollaborativeWorkflowParams {
  workflowId?: string;
  name: string;
  description?: string;
  stages: {
    stageId: string;
    name: string;
    description?: string;
    requiredCapabilities: string[];
    dependencies?: string[];
    parallelism?: number;
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      backoffStrategy: "linear" | "exponential";
      retryDelay: number;
    };
  }[];
  globalSettings?: {
    timeout?: number;
    maxConcurrentStages?: number;
    failurePolicy?: "stop" | "continue" | "retry";
  };
  metadata?: Record<string, any>;
}
```

**Example:**

```typescript
// Create complex data processing workflow
const workflow = await mcpClient.call("create_collaborative_workflow", {
  name: "Customer Analytics Pipeline",
  description: "End-to-end customer data processing and analysis",
  stages: [
    {
      stageId: "data-ingestion",
      name: "Data Ingestion",
      description: "Ingest customer data from multiple sources",
      requiredCapabilities: ["data-ingestion", "etl"],
      parallelism: 3,
      timeout: 600000, // 10 minutes
      retryPolicy: {
        maxRetries: 2,
        backoffStrategy: "exponential",
        retryDelay: 30000
      }
    },
    {
      stageId: "data-validation",
      name: "Data Validation",
      description: "Validate data quality and schema compliance",
      requiredCapabilities: ["data-validation", "quality-check"],
      dependencies: ["data-ingestion"],
      timeout: 300000, // 5 minutes
      retryPolicy: {
        maxRetries: 1,
        backoffStrategy: "linear",
        retryDelay: 15000
      }
    },
    {
      stageId: "data-processing",
      name: "Data Processing",
      description: "Transform and enrich customer data",
      requiredCapabilities: ["data-processing", "transformation"],
      dependencies: ["data-validation"],
      parallelism: 2,
      timeout: 900000 // 15 minutes
    },
    {
      stageId: "analysis",
      name: "Customer Analysis",
      description: "Perform customer segmentation and analysis",
      requiredCapabilities: ["statistical-analysis", "segmentation"],
      dependencies: ["data-processing"],
      timeout: 1200000 // 20 minutes
    },
    {
      stageId: "reporting",
      name: "Report Generation",
      description: "Generate customer insights report",
      requiredCapabilities: ["reporting", "visualization"],
      dependencies: ["analysis"],
      timeout: 300000 // 5 minutes
    }
  ],
  globalSettings: {
    timeout: 3600000, // 1 hour total
    maxConcurrentStages: 3,
    failurePolicy: "stop"
  },
  metadata: {
    owner: "analytics-team",
    priority: "high",
    schedule: "daily",
    notifications: ["team-lead@company.com"]
  }
});

console.log(`Workflow created: ${workflow.data.workflowId}`);
```

### `execute_workflow`

Executes a collaborative workflow.

**Parameters:**

```typescript
interface ExecuteWorkflowParams {
  workflowId: string;
  input: any;
  options?: {
    dryRun?: boolean;
    skipStages?: string[];
    overrideSettings?: {
      timeout?: number;
      parallelism?: Record<string, number>;
    };
  };
  metadata?: Record<string, any>;
}
```

**Example:**

```typescript
// Execute workflow with customer data
const execution = await mcpClient.call("execute_workflow", {
  workflowId: "customer-analytics-pipeline",
  input: {
    dataSources: [
      {
        type: "database",
        connection: "postgresql://analytics:5432/customers",
        query: "SELECT * FROM customers WHERE updated_at > ?",
        parameters: [new Date(Date.now() - 86400000)] // Last 24 hours
      },
      {
        type: "s3",
        bucket: "customer-events",
        prefix: "events/2024/12/",
        format: "json"
      }
    ],
    processingOptions: {
      deduplication: true,
      validation: "strict",
      enrichment: {
        geoLocation: true,
        demographics: true
      }
    },
    analysisOptions: {
      segmentationMethod: "kmeans",
      clusterCount: 5,
      includeLifetimeValue: true,
      generateRecommendations: true
    }
  },
  options: {
    dryRun: false
  },
  metadata: {
    executedBy: "scheduler",
    executionReason: "daily-batch",
    requestId: "req-20241201-001"
  }
});

console.log(`Workflow execution started: ${execution.data.executionId}`);
```

### `get_workflow_status`

Retrieves the current status of a workflow execution.

**Parameters:**

```typescript
interface GetWorkflowStatusParams {
  workflowId: string;
  executionId?: string;
  includeStageDetails?: boolean;
  includeMetrics?: boolean;
  includeLogs?: boolean;
}
```

**Response:**

```typescript
interface GetWorkflowStatusResponse {
  workflowId: string;
  executionId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: {
    totalStages: number;
    completedStages: number;
    currentStage?: string;
    overallProgress: number;
  };
  stages: {
    stageId: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    assignedAgent?: string;
    startTime?: number;
    endTime?: number;
    progress?: number;
    result?: any;
    error?: any;
  }[];
  metrics?: {
    startTime: number;
    endTime?: number;
    duration?: number;
    resourceUsage: {
      totalCpuHours: number;
      totalMemoryGBHours: number;
      totalNetworkGB: number;
    };
    performance: {
      averageStageTime: number;
      bottleneckStage?: string;
      efficiency: number;
    };
  };
  result?: any;
  error?: any;
}
```

**Example:**

```typescript
// Monitor workflow execution
const status = await mcpClient.call("get_workflow_status", {
  workflowId: "customer-analytics-pipeline",
  executionId: "exec-20241201-001",
  includeStageDetails: true,
  includeMetrics: true,
  includeLogs: false
});

console.log(`Workflow Status: ${status.data.status}`);
console.log(`Progress: ${status.data.progress.overallProgress}%`);

if (status.data.status === "running") {
  console.log(`Current Stage: ${status.data.progress.currentStage}`);

  // Show stage details
  for (const stage of status.data.stages) {
    console.log(`  ${stage.stageId}: ${stage.status} (${stage.assignedAgent})`);
  }
} else if (status.data.status === "completed") {
  console.log("Workflow completed successfully!");
  console.log(`Total duration: ${status.data.metrics.duration}ms`);
  console.log("Final result:", status.data.result);
}
```

## Error Handling

### Standard Error Codes

```typescript
enum MCPErrorCode {
  // General errors
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  TIMEOUT = "TIMEOUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",

  // Agent-specific errors
  AGENT_NOT_FOUND = "AGENT_NOT_FOUND",
  AGENT_UNAVAILABLE = "AGENT_UNAVAILABLE",
  AGENT_OVERLOADED = "AGENT_OVERLOADED",
  CAPABILITY_MISMATCH = "CAPABILITY_MISMATCH",

  // Task-specific errors
  TASK_NOT_FOUND = "TASK_NOT_FOUND",
  TASK_ALREADY_ASSIGNED = "TASK_ALREADY_ASSIGNED",
  TASK_EXECUTION_FAILED = "TASK_EXECUTION_FAILED",
  DEPENDENCY_FAILED = "DEPENDENCY_FAILED",

  // Resource-specific errors
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_LOCKED = "RESOURCE_LOCKED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RESOURCE_EXPIRED = "RESOURCE_EXPIRED",

  // Workflow-specific errors
  WORKFLOW_NOT_FOUND = "WORKFLOW_NOT_FOUND",
  WORKFLOW_EXECUTION_FAILED = "WORKFLOW_EXECUTION_FAILED",
  STAGE_FAILED = "STAGE_FAILED",
  CIRCULAR_DEPENDENCY = "CIRCULAR_DEPENDENCY"
}
```

### Error Handling Patterns

```typescript
// Robust error handling with retries
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Usage example
try {
  const result = await executeWithRetry(async () => {
    return await mcpClient.call("assign_task", {
      taskId: "task-12345",
      agentId: "analysis-agent-001"
    });
  });

  console.log("Task assigned successfully:", result.data);
} catch (error) {
  console.error("Failed to assign task after retries:", error);

  // Handle specific error cases
  switch (error.code) {
    case "AGENT_NOT_FOUND":
      console.log("Agent not found, discovering alternatives...");
      // Implement agent discovery fallback
      break;
    case "AGENT_OVERLOADED":
      console.log("Agent overloaded, queuing task...");
      // Implement task queuing
      break;
    default:
      console.log("Unexpected error, escalating...");
    // Implement error escalation
  }
}
```

## Code Examples

### Complete Workflow Implementation

```typescript
// Complete example: Customer data analysis workflow
class CustomerAnalyticsWorkflow {
  private mcpClient: MCPClient;
  private workflowId: string;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  async initialize(): Promise<void> {
    // Create workflow
    const workflow = await this.mcpClient.call(
      "create_collaborative_workflow",
      {
        name: "Customer Analytics Pipeline",
        description: "Comprehensive customer data analysis",
        stages: [
          {
            stageId: "ingestion",
            name: "Data Ingestion",
            requiredCapabilities: ["data-ingestion"],
            timeout: 600000
          },
          {
            stageId: "processing",
            name: "Data Processing",
            requiredCapabilities: ["data-processing"],
            dependencies: ["ingestion"],
            timeout: 900000
          },
          {
            stageId: "analysis",
            name: "Customer Analysis",
            requiredCapabilities: ["statistical-analysis"],
            dependencies: ["processing"],
            timeout: 1200000
          }
        ]
      }
    );

    this.workflowId = workflow.data.workflowId;
    console.log(`Workflow initialized: ${this.workflowId}`);
  }

  async execute(inputData: any): Promise<any> {
    // Execute workflow
    const execution = await this.mcpClient.call("execute_workflow", {
      workflowId: this.workflowId,
      input: inputData
    });

    const executionId = execution.data.executionId;
    console.log(`Execution started: ${executionId}`);

    // Monitor progress
    return await this.monitorExecution(executionId);
  }

  private async monitorExecution(executionId: string): Promise<any> {
    while (true) {
      const status = await this.mcpClient.call("get_workflow_status", {
        workflowId: this.workflowId,
        executionId,
        includeStageDetails: true
      });

      console.log(
        `Status: ${status.data.status} (${status.data.progress.overallProgress}%)`
      );

      if (status.data.status === "completed") {
        return status.data.result;
      } else if (status.data.status === "failed") {
        throw new Error(`Workflow failed: ${status.data.error.message}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Usage
const workflow = new CustomerAnalyticsWorkflow(mcpClient);
await workflow.initialize();

const result = await workflow.execute({
  dataSources: ["customer-db", "event-stream"],
  analysisType: "comprehensive"
});

console.log("Analysis complete:", result);
```

### Agent Discovery and Task Assignment

```typescript
// Smart agent discovery and task assignment
class SmartTaskAssigner {
  private mcpClient: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  async assignTask(taskDefinition: any): Promise<string> {
    // Create task
    const task = await this.mcpClient.call("create_task", taskDefinition);
    const taskId = task.data.taskId;

    // Discover suitable agents
    const agents = await this.discoverAgents(
      taskDefinition.requiredCapabilities
    );

    if (agents.length === 0) {
      throw new Error("No suitable agents found");
    }

    // Select best agent
    const bestAgent = this.selectBestAgent(agents, taskDefinition);

    // Assign task
    await this.mcpClient.call("assign_task", {
      taskId,
      agentId: bestAgent.agentId,
      priority: taskDefinition.priority
    });

    console.log(`Task ${taskId} assigned to ${bestAgent.name}`);
    return taskId;
  }

  private async discoverAgents(requiredCapabilities: string[]): Promise<any[]> {
    const discovery = await this.mcpClient.call("discover_agents", {
      requiredCapabilities,
      filters: {
        status: "active"
      },
      options: {
        includeMetrics: true,
        sortBy: "performance"
      }
    });

    return discovery.data.agents;
  }

  private selectBestAgent(agents: any[], taskDefinition: any): any {
    // Score agents based on multiple factors
    const scoredAgents = agents.map((agent) => {
      let score = 0;

      // Capability match score
      const capabilityMatch = taskDefinition.requiredCapabilities.every((cap) =>
        agent.capabilities.includes(cap)
      );
      score += capabilityMatch ? 50 : 0;

      // Performance score
      if (agent.metrics) {
        score += (agent.metrics.successRate || 0) * 30;
        score += Math.max(
          0,
          20 - (agent.metrics.averageResponseTime || 0) / 1000
        );
      }

      // Availability score
      const maxTasks = agent.metadata?.maxConcurrentTasks || 5;
      const currentTasks = agent.metadata?.currentTasks || 0;
      const availability = (maxTasks - currentTasks) / maxTasks;
      score += availability * 20;

      return { ...agent, score };
    });

    // Return agent with highest score
    return scoredAgents.sort((a, b) => b.score - a.score)[0];
  }
}

// Usage
const assigner = new SmartTaskAssigner(mcpClient);

const taskId = await assigner.assignTask({
  taskType: "data-analysis",
  description: "Analyze customer behavior patterns",
  requiredCapabilities: ["statistical-analysis", "data-visualization"],
  priority: "high",
  data: {
    input: { dataSource: "customer-events.csv" },
    parameters: { analysisType: "behavioral" }
  }
});
```

## SDK Integration

### TypeScript SDK

```typescript
// knowledge-graph-sdk.ts
export class KnowledgeGraphSDK {
  private mcpClient: MCPClient;

  constructor(config: {
    serverUrl: string;
    apiKey?: string;
    timeout?: number;
  }) {
    this.mcpClient = new MCPClient(config);
  }

  // High-level API methods
  async createAgent(agentConfig: AgentConfig): Promise<Agent> {
    const result = await this.mcpClient.call("register_agent", agentConfig);
    return new Agent(result.data, this.mcpClient);
  }

  async createWorkflow(workflowConfig: WorkflowConfig): Promise<Workflow> {
    const result = await this.mcpClient.call(
      "create_collaborative_workflow",
      workflowConfig
    );
    return new Workflow(result.data, this.mcpClient);
  }

  async searchEntities(query: SearchQuery): Promise<SearchResult[]> {
    const result = await this.mcpClient.call("search_nodes", query);
    return result.data.entities.map((entity) => new SearchResult(entity));
  }

  // Resource management
  async shareResource(resource: ResourceConfig): Promise<SharedResource> {
    const result = await this.mcpClient.call("share_resource", resource);
    return new SharedResource(result.data, this.mcpClient);
  }

  // Communication
  async sendMessage(message: MessageConfig): Promise<void> {
    await this.mcpClient.call("send_agent_message", message);
  }

  async createChannel(channelConfig: ChannelConfig): Promise<Channel> {
    const result = await this.mcpClient.call(
      "create_communication_channel",
      channelConfig
    );
    return new Channel(result.data, this.mcpClient);
  }
}

// Helper classes
export class Agent {
  constructor(
    private data: any,
    private mcpClient: MCPClient
  ) {}

  async updateStatus(status: AgentStatus): Promise<void> {
    await this.mcpClient.call("update_agent_status", {
      agentId: this.data.agentId,
      ...status
    });
  }

  async assignTask(taskId: string): Promise<void> {
    await this.mcpClient.call("assign_task", {
      taskId,
      agentId: this.data.agentId
    });
  }
}

export class Workflow {
  constructor(
    private data: any,
    private mcpClient: MCPClient
  ) {}

  async execute(input: any): Promise<WorkflowExecution> {
    const result = await this.mcpClient.call("execute_workflow", {
      workflowId: this.data.workflowId,
      input
    });

    return new WorkflowExecution(result.data, this.mcpClient);
  }

  async getStatus(): Promise<WorkflowStatus> {
    const result = await this.mcpClient.call("get_workflow_status", {
      workflowId: this.data.workflowId
    });

    return result.data;
  }
}

// Usage example
const sdk = new KnowledgeGraphSDK({
  serverUrl: "http://localhost:3000",
  apiKey: "your-api-key"
});

// Create and register an agent
const agent = await sdk.createAgent({
  agentId: "my-agent-001",
  name: "My Analysis Agent",
  capabilities: ["data-analysis", "reporting"]
});

// Create a workflow
const workflow = await sdk.createWorkflow({
  name: "Data Processing Pipeline",
  stages: [
    {
      stageId: "process",
      name: "Process Data",
      requiredCapabilities: ["data-processing"]
    }
  ]
});

// Execute workflow
const execution = await workflow.execute({
  dataSource: "input.csv"
});

// Monitor execution
const status = await workflow.getStatus();
console.log(`Workflow status: ${status.status}`);
```

---

_This API reference provides comprehensive documentation for all agent
collaboration features in the Agent Collaboration system. For additional
examples and advanced usage patterns, refer to the integration guide and best
practices documentation._

_Last updated: December 2024_ _Version: 2.0.0_
