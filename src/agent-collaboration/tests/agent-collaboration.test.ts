import { describe, it, expect, beforeEach, mock } from "bun:test";
import { KnowledgeGraphManager } from "../index.ts";

// Mock fs module using Bun's mock
const mockReadFile = mock(() =>
  Promise.resolve('{"entities":[],"relations":[]}')
);
const mockWriteFile = mock(() => Promise.resolve());
const mockAccess = mock(() => Promise.resolve());
const mockExistsSync = mock(() => false);

mock.module("fs", () => ({
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    access: mockAccess
  },
  existsSync: mockExistsSync
}));

describe("Agent Collaboration Features", () => {
  let manager: KnowledgeGraphManager;
  const testFilePath = "/tmp/test-collaboration.json";

  beforeEach(() => {
    manager = new KnowledgeGraphManager(testFilePath);
    mockReadFile.mockClear();
    mockWriteFile.mockClear();

    // Setup initial graph with some test data
    const initialData = {
      entities: [
        {
          name: "agent-1",
          entityType: "agent",
          observations: [
            "status:active",
            "capabilities:data-analysis,report-generation",
            "last_seen:2024-01-15T10:00:00Z"
          ]
        },
        {
          name: "agent-2",
          entityType: "agent",
          observations: [
            "status:idle",
            "capabilities:web-scraping,data-processing",
            "last_seen:2024-01-15T09:30:00Z"
          ]
        },
        {
          name: "task-123",
          entityType: "task",
          observations: [
            "title:Analyze sales data",
            "status:pending",
            "priority:high",
            "created_by:agent-1",
            "assigned_to:agent-2"
          ]
        },
        {
          name: "resource-db1",
          entityType: "resource",
          observations: [
            "type:database",
            "status:available",
            "shared_with:agent-1,agent-2",
            "permissions:read,write"
          ]
        },
        {
          name: "workflow-w1",
          entityType: "workflow",
          observations: [
            "title:Data Processing Pipeline",
            "status:active",
            "participants:agent-1,agent-2",
            "created_by:agent-1"
          ]
        }
      ],
      relations: [
        { from: "agent-1", to: "task-123", relationType: "created" },
        { from: "agent-2", to: "task-123", relationType: "assigned_to" },
        { from: "agent-1", to: "resource-db1", relationType: "has_access" },
        { from: "agent-2", to: "resource-db1", relationType: "has_access" },
        { from: "agent-1", to: "workflow-w1", relationType: "participates_in" },
        { from: "agent-2", to: "workflow-w1", relationType: "participates_in" }
      ]
    };
    mockReadFile.mockResolvedValue(JSON.stringify(initialData));
  });

  describe("Agent Management", () => {
    it("should register a new agent successfully", async () => {
      const agentData = {
        name: "agent-3",
        entityType: "agent",
        observations: [
          "status:active",
          "capabilities:machine-learning,prediction",
          "last_seen:2024-01-15T11:00:00Z",
          'metadata:{"version":"1.0","environment":"production"}'
        ]
      };

      const result = await manager.createEntities([agentData]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("agent-3");
      expect(result[0].entityType).toBe("agent");
      expect(result[0].observations).toContain("status:active");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should update agent status", async () => {
      const statusUpdate = {
        entityName: "agent-1",
        contents: ["status:busy", "current_task:data-analysis-job"]
      };

      // This would be called through add_observations
      const result = await manager.addObservations([statusUpdate]);

      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should discover agents by capabilities", async () => {
      const result = await manager.searchNodes("data-analysis");

      expect(result.entities.length).toBeGreaterThan(0);
      const agent = result.entities.find((e) => e.name === "agent-1");
      expect(agent).toBeDefined();
      if (agent) {
        expect(
          agent.observations.some((obs) => obs.includes("data-analysis"))
        ).toBe(true);
      }
    });

    it("should get agent status information", async () => {
      const result = await manager.openNodes(["agent-1"]);

      expect(result.entities).toHaveLength(1);
      const agent = result.entities[0];
      expect(agent).toBeDefined();
      if (agent) {
        expect(agent.name).toBe("agent-1");
        expect(agent.entityType).toBe("agent");
        expect(agent.observations.some((obs) => obs.includes("status:"))).toBe(
          true
        );
      }
    });
  });

  describe("Task Delegation", () => {
    it("should create a delegation task", async () => {
      const taskData = {
        name: "task-456",
        entityType: "task",
        observations: [
          "title:Process customer feedback",
          "status:pending",
          "priority:medium",
          "created_by:agent-1",
          "delegated_to:agent-2",
          "deadline:2024-01-20T12:00:00Z",
          'metadata:{"requirements":["sentiment-analysis","categorization"]}'
        ]
      };

      const result = await manager.createEntities([taskData]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("task-456");
      expect(result[0].observations).toContain("delegated_to:agent-2");
    });

    it("should accept a delegated task", async () => {
      const acceptanceUpdate = {
        entityName: "task-123",
        contents: [
          "status:accepted",
          "accepted_by:agent-2",
          "accepted_at:2024-01-15T11:30:00Z"
        ]
      };

      const result = await manager.addObservations([acceptanceUpdate]);
      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should reject a delegated task", async () => {
      const rejectionUpdate = {
        entityName: "task-123",
        contents: [
          "status:rejected",
          "rejected_by:agent-2",
          "rejected_at:2024-01-15T11:30:00Z",
          "rejection_reason:Insufficient capabilities"
        ]
      };

      const result = await manager.addObservations([rejectionUpdate]);
      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should get agent delegations", async () => {
      const result = await manager.searchNodes("assigned_to:agent-2");

      expect(result.entities.length).toBeGreaterThan(0);
      const task = result.entities.find((e) => e.entityType === "task");
      expect(task).toBeDefined();
      if (task) {
        expect(
          task.observations.some((obs) => obs.includes("assigned_to:agent-2"))
        ).toBe(true);
      }
    });
  });

  describe("Resource Sharing", () => {
    it("should share a resource with another agent", async () => {
      const resourceData = {
        name: "resource-api1",
        entityType: "resource",
        observations: [
          "type:api",
          "status:available",
          "shared_by:agent-1",
          "shared_with:agent-2",
          "permissions:read",
          "shared_at:2024-01-15T12:00:00Z"
        ]
      };

      const result = await manager.createEntities([resourceData]);

      expect(result).toHaveLength(1);
      expect(result[0].observations).toContain("shared_with:agent-2");
    });

    it("should revoke resource sharing", async () => {
      const revocationUpdate = {
        entityName: "resource-db1",
        contents: [
          "shared_with:agent-1", // Remove agent-2
          "revoked_from:agent-2",
          "revoked_at:2024-01-15T12:30:00Z"
        ]
      };

      const result = await manager.addObservations([revocationUpdate]);
      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should get shared resources for an agent", async () => {
      const result = await manager.searchNodes("shared_with:agent-1");

      expect(result.entities.length).toBeGreaterThan(0);
      const resource = result.entities.find((e) => e.entityType === "resource");
      expect(resource).toBeDefined();
      if (resource) {
        expect(resource.entityType).toBe("resource");
      }
    });

    it("should get resource shares by an agent", async () => {
      const result = await manager.searchNodes("shared_by:agent-1");

      expect(result.entities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Collaborative Workflows", () => {
    it("should create a collaborative workflow", async () => {
      const workflowData = {
        name: "workflow-w2",
        entityType: "workflow",
        observations: [
          "title:Customer Data Analysis",
          "status:active",
          "created_by:agent-1",
          "participants:agent-1",
          "created_at:2024-01-15T13:00:00Z",
          'metadata:{"steps":["data-collection","analysis","reporting"]}'
        ]
      };

      const result = await manager.createEntities([workflowData]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("workflow-w2");
      expect(result[0].observations).toContain("created_by:agent-1");
    });

    it("should join a workflow", async () => {
      const joinUpdate = {
        entityName: "workflow-w1",
        contents: [
          "participants:agent-1,agent-2,agent-3",
          "joined_by:agent-3",
          "joined_at:2024-01-15T13:30:00Z"
        ]
      };

      const result = await manager.addObservations([joinUpdate]);
      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should leave a workflow", async () => {
      const leaveUpdate = {
        entityName: "workflow-w1",
        contents: [
          "participants:agent-1", // Remove agent-2
          "left_by:agent-2",
          "left_at:2024-01-15T14:00:00Z"
        ]
      };

      const result = await manager.addObservations([leaveUpdate]);
      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should update workflow status", async () => {
      const statusUpdate = {
        entityName: "workflow-w1",
        contents: [
          "status:completed",
          "completed_at:2024-01-15T15:00:00Z",
          "completion_summary:All tasks completed successfully"
        ]
      };

      const result = await manager.addObservations([statusUpdate]);
      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should get workflow participants", async () => {
      const result = await manager.openNodes(["workflow-w1"]);

      expect(result.entities).toHaveLength(1);
      const workflow = result.entities[0];
      expect(workflow).toBeDefined();
      if (workflow) {
        expect(
          workflow.observations.some((obs) => obs.includes("participants:"))
        ).toBe(true);
      }
    });

    it("should get agent workflows", async () => {
      const result = await manager.searchNodes("participants:agent-1");

      expect(result.entities.length).toBeGreaterThan(0);
      const workflow = result.entities.find((e) => e.entityType === "workflow");
      expect(workflow).toBeDefined();
      if (workflow) {
        expect(workflow.entityType).toBe("workflow");
      }
    });
  });

  describe("Communication and Events", () => {
    it("should create a communication channel", async () => {
      const channelData = {
        name: "channel-general",
        entityType: "channel",
        observations: [
          "type:broadcast",
          "created_by:agent-1",
          "participants:agent-1,agent-2",
          "created_at:2024-01-15T16:00:00Z"
        ]
      };

      const result = await manager.createEntities([channelData]);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe("channel");
    });

    it("should send a message", async () => {
      const messageData = {
        name: "message-001",
        entityType: "message",
        observations: [
          "from:agent-1",
          "to:agent-2",
          "content:Task completed successfully",
          "timestamp:2024-01-15T16:30:00Z",
          "channel:channel-general"
        ]
      };

      const result = await manager.createEntities([messageData]);

      expect(result).toHaveLength(1);
      expect(result[0].observations).toContain("from:agent-1");
    });

    it("should create an event", async () => {
      const eventData = {
        name: "event-task-completed",
        entityType: "event",
        observations: [
          "type:task_completed",
          "source:agent-2",
          "task_id:task-123",
          "timestamp:2024-01-15T17:00:00Z",
          'metadata:{"duration":"2h","result":"success"}'
        ]
      };

      const result = await manager.createEntities([eventData]);

      expect(result).toHaveLength(1);
      expect(result[0].observations).toContain("type:task_completed");
    });

    it("should get messages for an agent", async () => {
      const result = await manager.searchNodes("to:agent-2");

      expect(result.entities.length).toBeGreaterThanOrEqual(0);
    });

    it("should get events by type", async () => {
      const result = await manager.searchNodes("type:task_completed");

      expect(result.entities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Enhanced Queries", () => {
    it("should perform complex agent queries", async () => {
      // Query for active agents with specific capabilities
      const result = await manager.searchNodes(
        "status:active AND capabilities:data-analysis"
      );

      expect(result.entities.length).toBeGreaterThanOrEqual(0);
    });

    it("should get agent relationships", async () => {
      const result = await manager.readGraph();

      expect(result.relations.length).toBeGreaterThan(0);
      const agentRelations = result.relations.filter(
        (r) => r.from.startsWith("agent-") || r.to.startsWith("agent-")
      );
      expect(agentRelations.length).toBeGreaterThan(0);
    });

    it("should search by entity type and metadata", async () => {
      const result = await manager.searchNodes(
        "entityType:task AND priority:high"
      );

      expect(result.entities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid agent registration", async () => {
      const invalidAgent = {
        name: "",
        entityType: "agent",
        observations: []
      };

      await expect(manager.createEntities([invalidAgent])).rejects.toThrow(
        "Entity name must be a non-empty string"
      );
    });

    it("should handle non-existent task delegation", async () => {
      const result = await manager.openNodes(["non-existent-task"]);

      expect(result.entities).toHaveLength(0);
    });

    it("should handle empty search queries", async () => {
      const result = await manager.searchNodes("");

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
    });

    it("should handle malformed metadata", async () => {
      const entityWithBadMetadata = {
        name: "test-entity",
        entityType: "test",
        observations: ["metadata:invalid-json"]
      };

      // Should not throw, just store as-is
      const result = await manager.createEntities([entityWithBadMetadata]);
      expect(result).toHaveLength(1);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple concurrent operations", async () => {
      const operations = [
        manager.createEntities([
          {
            name: "concurrent-agent-1",
            entityType: "agent",
            observations: ["status:active"]
          }
        ]),
        manager.createEntities([
          {
            name: "concurrent-task-1",
            entityType: "task",
            observations: ["status:pending"]
          }
        ]),
        manager.searchNodes("status:active")
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0]) && results[0]).toHaveLength(1); // First create
      expect(Array.isArray(results[1]) && results[1]).toHaveLength(1); // Second create
      expect(results[2]).toHaveProperty("entities"); // Search
    });

    it("should handle large observation arrays", async () => {
      const largeObservations = Array.from(
        { length: 100 },
        (_, i) => `observation-${i}:value-${i}`
      );

      const entityWithManyObs = {
        name: "large-entity",
        entityType: "test",
        observations: largeObservations
      };

      const result = await manager.createEntities([entityWithManyObs]);

      expect(result).toHaveLength(1);
      if (result[0]) {
        expect(result[0].observations).toHaveLength(100);
      }
    });
  });
});
