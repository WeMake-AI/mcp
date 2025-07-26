/* eslint-env node */

/**
 * Agent Collaboration Demo
 *
 * This example demonstrates the comprehensive agent collaboration features
 * of the Agent Collaboration MCP server, including:
 * - Agent registration and discovery
 * - Task delegation workflows
 * - Resource sharing and management
 * - Collaborative workflows
 * - Communication channels and events
 * - Advanced querying capabilities
 */

class AgentCollaborationDemo {
  constructor(mcpClient) {
    this.client = mcpClient;
  }

  /**
   * Demo 1: Agent Registration and Discovery
   */
  async demoAgentRegistration() {
    console.log("=== Agent Registration and Discovery Demo ===");

    // Register multiple agents with different capabilities
    const agents = [
      {
        agentId: "data-processor-01",
        agentType: "DataProcessor",
        capabilities: ["data-analysis", "report-generation", "csv-processing"],
        metadata: {
          version: "1.2.0",
          maxConcurrentTasks: 5,
          supportedFormats: ["csv", "json", "xml"]
        }
      },
      {
        agentId: "ml-analyst-02",
        agentType: "MLAnalyst",
        capabilities: ["machine-learning", "data-analysis", "prediction"],
        metadata: {
          version: "2.1.0",
          frameworks: ["tensorflow", "pytorch", "scikit-learn"],
          gpuEnabled: true
        }
      },
      {
        agentId: "report-generator-03",
        agentType: "ReportGenerator",
        capabilities: ["report-generation", "visualization", "pdf-creation"],
        metadata: {
          version: "1.0.5",
          outputFormats: ["pdf", "html", "docx"]
        }
      }
    ];

    // Register all agents
    for (const agent of agents) {
      await this.client.callTool("register_agent", agent);
      console.log(`Registered agent: ${agent.agentId}`);
    }

    // Update agent statuses
    await this.client.callTool("update_agent_status", {
      agentId: "data-processor-01",
      status: "active",
      statusMessage: "Ready for data processing tasks"
    });

    await this.client.callTool("update_agent_status", {
      agentId: "ml-analyst-02",
      status: "busy",
      statusMessage: "Training neural network model"
    });

    // Discover agents with specific capabilities
    const dataAnalysts = await this.client.callTool("discover_agents", {
      capabilities: ["data-analysis"]
    });
    console.log("Data analysis capable agents:", dataAnalysts);

    // List all active agents
    const activeAgents = await this.client.callTool("list_active_agents", {});
    console.log("Active agents:", activeAgents);
  }

  /**
   * Demo 2: Task Delegation Workflow
   */
  async demoTaskDelegation() {
    console.log("\n=== Task Delegation Demo ===");

    // Coordinator delegates a task to data processor
    const delegation = await this.client.callTool("delegate_task", {
      fromAgent: "coordinator-01",
      toAgent: "data-processor-01",
      taskId: "process-sales-data-q4",
      taskDescription: "Process Q4 sales data and generate summary statistics",
      priority: "high",
      deadline: "2024-01-15T18:00:00Z"
    });
    console.log("Task delegated:", delegation);

    // Data processor accepts the delegation
    await this.client.callTool("accept_delegation", {
      delegationId: delegation.delegationId,
      agentId: "data-processor-01"
    });
    console.log("Delegation accepted by data-processor-01");

    // Delegate another task to ML analyst
    const mlDelegation = await this.client.callTool("delegate_task", {
      fromAgent: "coordinator-01",
      toAgent: "ml-analyst-02",
      taskId: "predict-sales-trends",
      taskDescription: "Analyze sales data and predict Q1 trends",
      priority: "medium",
      deadline: "2024-01-20T12:00:00Z"
    });

    // ML analyst rejects due to current workload
    await this.client.callTool("reject_delegation", {
      delegationId: mlDelegation.delegationId,
      agentId: "ml-analyst-02",
      reason: "Currently training critical model, cannot take additional tasks"
    });
    console.log("Delegation rejected by ml-analyst-02");

    // Check delegations for data processor
    const processorDelegations = await this.client.callTool(
      "get_agent_delegations",
      {
        agentId: "data-processor-01",
        status: "accepted"
      }
    );
    console.log("Data processor accepted delegations:", processorDelegations);
  }

  /**
   * Demo 3: Resource Sharing and Management
   */
  async demoResourceManagement() {
    console.log("\n=== Resource Management Demo ===");

    // Share a dataset with multiple agents
    await this.client.callTool("share_resource", {
      resourceId: "sales-dataset-q4-2023",
      ownerAgent: "data-manager-01",
      sharedWithAgents: ["data-processor-01", "ml-analyst-02"],
      permissions: ["read", "write"],
      expiresAt: "2024-02-01T00:00:00Z"
    });
    console.log("Dataset shared with processing agents");

    // Share analysis tools with read-only access
    await this.client.callTool("share_resource", {
      resourceId: "analysis-tools-suite",
      ownerAgent: "tool-manager-01",
      sharedWithAgents: [
        "data-processor-01",
        "ml-analyst-02",
        "report-generator-03"
      ],
      permissions: ["read", "execute"]
    });

    // Data processor locks dataset for exclusive processing
    await this.client.callTool("lock_resource", {
      resourceId: "sales-dataset-q4-2023",
      agentId: "data-processor-01",
      lockType: "exclusive"
    });
    console.log("Dataset locked for exclusive access");

    // Check resource status
    const resourceStatus = await this.client.callTool("check_resource_status", {
      resourceId: "sales-dataset-q4-2023"
    });
    console.log("Resource status:", resourceStatus);

    // Check what resources are available to ML analyst
    const mlResources = await this.client.callTool("get_shared_resources", {
      agentId: "ml-analyst-02"
    });
    console.log("ML analyst available resources:", mlResources);

    // Unlock resource after processing
    await this.client.callTool("unlock_resource", {
      resourceId: "sales-dataset-q4-2023",
      agentId: "data-processor-01"
    });
    console.log("Dataset unlocked");
  }

  /**
   * Demo 4: Collaborative Workflow Management
   */
  async demoCollaborativeWorkflow() {
    console.log("\n=== Collaborative Workflow Demo ===");

    // Create a comprehensive quarterly report workflow
    const workflow = await this.client.callTool(
      "create_collaborative_workflow",
      {
        workflowId: "quarterly-report-q4-2023",
        creatorAgent: "coordinator-01",
        title: "Q4 2023 Quarterly Report Generation",
        description:
          "Comprehensive workflow for generating Q4 business intelligence reports",
        participants: [
          "data-processor-01",
          "ml-analyst-02",
          "report-generator-03"
        ],
        workflowType: "sequential",
        deadline: "2024-01-25T17:00:00Z"
      }
    );
    console.log("Collaborative workflow created:", workflow);

    // Quality checker joins the workflow
    await this.client.callTool("join_workflow", {
      workflowId: "quarterly-report-q4-2023",
      agentId: "quality-checker-04",
      role: "reviewer"
    });
    console.log("Quality checker joined workflow");

    // Update workflow status as work progresses
    await this.client.callTool("update_workflow_status", {
      workflowId: "quarterly-report-q4-2023",
      agentId: "coordinator-01",
      status: "active",
      statusMessage: "Data processing phase initiated"
    });

    // Get workflow participants
    const participants = await this.client.callTool(
      "get_workflow_participants",
      {
        workflowId: "quarterly-report-q4-2023"
      }
    );
    console.log("Workflow participants:", participants);

    // Check workflows for a specific agent
    const agentWorkflows = await this.client.callTool("get_agent_workflows", {
      agentId: "data-processor-01",
      status: "active"
    });
    console.log("Data processor active workflows:", agentWorkflows);
  }

  /**
   * Demo 5: Communication and Event System
   */
  async demoCommunicationSystem() {
    console.log("\n=== Communication System Demo ===");

    // Create a team communication channel
    await this.client.callTool("create_communication_channel", {
      channelId: "quarterly-report-team",
      creatorAgent: "coordinator-01",
      participants: [
        "data-processor-01",
        "ml-analyst-02",
        "report-generator-03",
        "quality-checker-04"
      ],
      channelType: "group"
    });
    console.log("Team communication channel created");

    // Send coordination messages
    await this.client.callTool("send_channel_message", {
      channelId: "quarterly-report-team",
      fromAgent: "coordinator-01",
      messageContent:
        "Welcome to the Q4 report generation team! Data processing will begin shortly."
    });

    await this.client.callTool("send_channel_message", {
      channelId: "quarterly-report-team",
      fromAgent: "data-processor-01",
      messageContent:
        "Data processing completed. Dataset is ready for analysis."
    });

    // Subscribe agents to relevant events
    await this.client.callTool("subscribe_to_events", {
      agentId: "quality-checker-04",
      eventTypes: ["task-completed", "workflow-status-changed", "data-ready"]
    });

    await this.client.callTool("subscribe_to_events", {
      agentId: "coordinator-01",
      eventTypes: ["task-completed", "task-failed", "agent-status-changed"]
    });

    // Publish task completion event
    await this.client.callTool("publish_event", {
      publisherAgent: "data-processor-01",
      eventType: "task-completed",
      eventData: {
        taskId: "process-sales-data-q4",
        status: "completed",
        outputLocation: "/data/processed/sales-q4-2023.json",
        recordsProcessed: 15420,
        processingTime: "00:12:34"
      }
    });
    console.log("Task completion event published");

    // Get channel messages
    const channelMessages = await this.client.callTool("get_channel_messages", {
      channelId: "quarterly-report-team",
      limit: 10
    });
    console.log("Channel messages:", channelMessages);

    // Get events for quality checker
    const qualityEvents = await this.client.callTool("get_agent_events", {
      agentId: "quality-checker-04",
      eventTypes: ["task-completed"]
    });
    console.log("Quality checker events:", qualityEvents);
  }

  /**
   * Demo 6: Advanced Querying and Search
   */
  async demoAdvancedQuerying() {
    console.log("\n=== Advanced Querying Demo ===");

    // Search all content created by data processor
    const processorContent = await this.client.callTool("search_by_agent", {
      agentId: "data-processor-01"
    });
    console.log("Data processor created content:", processorContent);

    // Search all content related to the quarterly report workflow
    const workflowContent = await this.client.callTool("search_by_workflow", {
      workflowId: "quarterly-report-q4-2023"
    });
    console.log("Workflow related content:", workflowContent);

    // Complex search for active agents with data analysis capabilities
    const complexSearch = await this.client.callTool("search_nodes", {
      query: "entityType:Agent AND status:active AND capability:data-analysis"
    });
    console.log("Active data analysis agents:", complexSearch);

    // Search for completed tasks in the last week
    const recentTasks = await this.client.callTool("search_nodes", {
      query: "entityType:Task AND status:completed AND createdAt:>2024-01-01"
    });
    console.log("Recent completed tasks:", recentTasks);
  }

  /**
   * Run all demos in sequence
   */
  async runAllDemos() {
    try {
      await this.demoAgentRegistration();
      await this.demoTaskDelegation();
      await this.demoResourceManagement();
      await this.demoCollaborativeWorkflow();
      await this.demoCommunicationSystem();
      await this.demoAdvancedQuerying();

      console.log("\n=== All demos completed successfully! ===");
    } catch (error) {
      console.error("Demo failed:", error);
    }
  }
}

// Usage example:
// const demo = new AgentCollaborationDemo(mcpClient);
// await demo.runAllDemos();

module.exports = AgentCollaborationDemo;
