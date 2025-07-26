/* eslint-env node */
/* eslint-disable no-undef */
/**
 * Agent Collaboration Tests
 *
 * Test suite for validating agent collaboration features
 * in the Agent Collaboration MCP server.
 */

const { strict: assert } = require("assert");

class CollaborationTests {
  constructor(mcpClient) {
    this.client = mcpClient;
    this.testResults = [];
  }

  async runTest(testName, testFn) {
    try {
      await testFn();
      this.testResults.push({ name: testName, status: "PASS" });
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: "FAIL",
        error: error.message
      });
    }
  }

  async testAgentRegistration() {
    await this.runTest("Agent Registration", async () => {
      // Register a test agent
      const result = await this.client.callTool("register_agent", {
        agentId: "test-agent-001",
        agentType: "TestAgent",
        capabilities: ["testing", "validation"],
        metadata: {
          version: "1.0.0",
          testMode: true
        }
      });

      assert(result.success, "Agent registration should succeed");

      // Verify agent was registered
      const agentInfo = await this.client.callTool("get_agent_info", {
        agentId: "test-agent-001"
      });

      assert.equal(agentInfo.agentId, "test-agent-001");
      assert.equal(agentInfo.agentType, "TestAgent");
      assert(agentInfo.capabilities.includes("testing"));
    });
  }

  async testAgentStatusUpdate() {
    await this.runTest("Agent Status Update", async () => {
      // Update agent status
      await this.client.callTool("update_agent_status", {
        agentId: "test-agent-001",
        status: "active",
        statusMessage: "Running tests"
      });

      // Verify status was updated
      const agentInfo = await this.client.callTool("get_agent_info", {
        agentId: "test-agent-001"
      });

      assert.equal(agentInfo.status, "active");
      assert.equal(agentInfo.statusMessage, "Running tests");
    });
  }

  async testAgentDiscovery() {
    await this.runTest("Agent Discovery", async () => {
      // Register another agent
      await this.client.callTool("register_agent", {
        agentId: "test-agent-002",
        agentType: "TestAgent",
        capabilities: ["testing", "analysis"],
        metadata: { version: "1.1.0" }
      });

      // Discover agents by capability
      const agents = await this.client.callTool("discover_agents", {
        capabilities: ["testing"]
      });

      assert(agents.length >= 2, "Should find at least 2 test agents");

      const agentIds = agents.map((a) => a.agentId);
      assert(agentIds.includes("test-agent-001"));
      assert(agentIds.includes("test-agent-002"));
    });
  }

  async testTaskDelegation() {
    await this.runTest("Task Delegation", async () => {
      // Delegate a task
      const delegation = await this.client.callTool("delegate_task", {
        fromAgent: "test-coordinator",
        toAgent: "test-agent-001",
        taskId: "test-task-001",
        taskDescription: "Execute test validation",
        priority: "medium",
        deadline: "2024-12-31T23:59:59Z"
      });

      assert(delegation.delegationId, "Should return delegation ID");

      // Accept the delegation
      await this.client.callTool("accept_delegation", {
        delegationId: delegation.delegationId,
        agentId: "test-agent-001"
      });

      // Verify delegation status
      const delegations = await this.client.callTool("get_agent_delegations", {
        agentId: "test-agent-001",
        status: "accepted"
      });

      assert(delegations.length > 0, "Should have accepted delegations");
      assert.equal(delegations[0].taskId, "test-task-001");
    });
  }

  async testResourceSharing() {
    await this.runTest("Resource Sharing", async () => {
      // Share a resource
      await this.client.callTool("share_resource", {
        resourceId: "test-dataset-001",
        ownerAgent: "test-data-owner",
        sharedWithAgents: ["test-agent-001", "test-agent-002"],
        permissions: ["read", "write"]
      });

      // Verify resource sharing
      const sharedResources = await this.client.callTool(
        "get_shared_resources",
        {
          agentId: "test-agent-001"
        }
      );

      assert(sharedResources.length > 0, "Should have shared resources");

      const testResource = sharedResources.find(
        (r) => r.resourceId === "test-dataset-001"
      );
      assert(testResource, "Should find test dataset");
      assert(testResource.permissions.includes("read"));
      assert(testResource.permissions.includes("write"));
    });
  }

  async testResourceLocking() {
    await this.runTest("Resource Locking", async () => {
      // Lock a resource
      await this.client.callTool("lock_resource", {
        resourceId: "test-dataset-001",
        agentId: "test-agent-001",
        lockType: "exclusive"
      });

      // Check resource status
      const status = await this.client.callTool("check_resource_status", {
        resourceId: "test-dataset-001"
      });

      assert.equal(status.lockType, "exclusive");
      assert.equal(status.lockedBy, "test-agent-001");

      // Unlock the resource
      await this.client.callTool("unlock_resource", {
        resourceId: "test-dataset-001",
        agentId: "test-agent-001"
      });

      // Verify unlock
      const unlockedStatus = await this.client.callTool(
        "check_resource_status",
        {
          resourceId: "test-dataset-001"
        }
      );

      assert.equal(unlockedStatus.lockType, "none");
    });
  }

  async testCollaborativeWorkflow() {
    await this.runTest("Collaborative Workflow", async () => {
      // Create a workflow
      const workflow = await this.client.callTool(
        "create_collaborative_workflow",
        {
          workflowId: "test-workflow-001",
          creatorAgent: "test-coordinator",
          title: "Test Workflow",
          description: "Testing collaborative workflow features",
          participants: ["test-agent-001", "test-agent-002"],
          workflowType: "parallel"
        }
      );

      assert.equal(workflow.workflowId, "test-workflow-001");

      // Join workflow
      await this.client.callTool("join_workflow", {
        workflowId: "test-workflow-001",
        agentId: "test-agent-003",
        role: "observer"
      });

      // Get participants
      const participants = await this.client.callTool(
        "get_workflow_participants",
        {
          workflowId: "test-workflow-001"
        }
      );

      assert(participants.length >= 3, "Should have at least 3 participants");

      // Update workflow status
      await this.client.callTool("update_workflow_status", {
        workflowId: "test-workflow-001",
        agentId: "test-coordinator",
        status: "active",
        statusMessage: "Testing in progress"
      });
    });
  }

  async testCommunicationChannel() {
    await this.runTest("Communication Channel", async () => {
      // Create communication channel
      await this.client.callTool("create_communication_channel", {
        channelId: "test-channel-001",
        creatorAgent: "test-coordinator",
        participants: ["test-agent-001", "test-agent-002"],
        channelType: "group"
      });

      // Send messages
      await this.client.callTool("send_channel_message", {
        channelId: "test-channel-001",
        fromAgent: "test-coordinator",
        messageContent: "Test message 1"
      });

      await this.client.callTool("send_channel_message", {
        channelId: "test-channel-001",
        fromAgent: "test-agent-001",
        messageContent: "Test response"
      });

      // Get messages
      const messages = await this.client.callTool("get_channel_messages", {
        channelId: "test-channel-001",
        limit: 10
      });

      assert(messages.length >= 2, "Should have at least 2 messages");
      assert.equal(messages[0].messageContent, "Test message 1");
    });
  }

  async testEventSystem() {
    await this.runTest("Event System", async () => {
      // Subscribe to events
      await this.client.callTool("subscribe_to_events", {
        agentId: "test-agent-001",
        eventTypes: ["test-event", "task-completed"]
      });

      // Publish an event
      await this.client.callTool("publish_event", {
        publisherAgent: "test-coordinator",
        eventType: "test-event",
        eventData: {
          message: "Test event data",
          timestamp: new Date().toISOString()
        }
      });

      // Get events
      const events = await this.client.callTool("get_agent_events", {
        agentId: "test-agent-001",
        eventTypes: ["test-event"]
      });

      assert(events.length > 0, "Should have received events");
      assert.equal(events[0].eventType, "test-event");
    });
  }

  async testAdvancedQuerying() {
    await this.runTest("Advanced Querying", async () => {
      // Search by agent
      const agentContent = await this.client.callTool("search_by_agent", {
        agentId: "test-agent-001"
      });

      assert(
        Array.isArray(agentContent.entities),
        "Should return entities array"
      );
      assert(
        Array.isArray(agentContent.relations),
        "Should return relations array"
      );

      // Search by workflow
      const workflowContent = await this.client.callTool("search_by_workflow", {
        workflowId: "test-workflow-001"
      });

      assert(
        Array.isArray(workflowContent.entities),
        "Should return entities array"
      );
      assert(
        Array.isArray(workflowContent.relations),
        "Should return relations array"
      );
    });
  }

  async testCleanup() {
    await this.runTest("Cleanup", async () => {
      // Revoke resource shares
      await this.client.callTool("revoke_resource_share", {
        resourceId: "test-dataset-001",
        ownerAgent: "test-data-owner",
        revokeFromAgents: ["test-agent-001", "test-agent-002"]
      });

      // Leave workflow
      await this.client.callTool("leave_workflow", {
        workflowId: "test-workflow-001",
        agentId: "test-agent-003",
        reason: "Test completed"
      });

      // Verify cleanup
      const sharedResources = await this.client.callTool(
        "get_shared_resources",
        {
          agentId: "test-agent-001"
        }
      );

      const testResource = sharedResources.find(
        (r) => r.resourceId === "test-dataset-001"
      );
      assert(!testResource, "Resource share should be revoked");
    });
  }

  async runAllTests() {
    const tests = [
      () => this.testAgentRegistration(),
      () => this.testAgentStatusUpdate(),
      () => this.testAgentDiscovery(),
      () => this.testTaskDelegation(),
      () => this.testResourceSharing(),
      () => this.testResourceLocking(),
      () => this.testCollaborativeWorkflow(),
      () => this.testCommunicationChannel(),
      () => this.testEventSystem(),
      () => this.testAdvancedQuerying(),
      () => this.testCleanup()
    ];

    for (const test of tests) {
      await test();
    }

    return this.getTestSummary();
  }

  getTestSummary() {
    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;

    return {
      total: this.testResults.length,
      passed,
      failed,
      results: this.testResults
    };
  }
}

module.exports = CollaborationTests;

// Usage example:
// const tests = new CollaborationTests(mcpClient);
// const summary = await tests.runAllTests();
// console.log('Test Summary:', summary);
