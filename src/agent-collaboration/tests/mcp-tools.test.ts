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

describe("MCP Tool Handlers for Agent Collaboration", () => {
  let manager: KnowledgeGraphManager;
  const testFilePath = "/tmp/test-mcp-tools.json";

  beforeEach(() => {
    manager = new KnowledgeGraphManager(testFilePath);
    mockReadFile.mockClear();
    mockWriteFile.mockClear();

    // Setup initial graph with agent collaboration data
    const initialData = {
      entities: [
        {
          name: "agent-test-1",
          entityType: "agent",
          observations: [
            "status:active",
            "capabilities:testing,validation",
            "last_seen:2024-01-15T10:00:00Z"
          ]
        },
        {
          name: "task-test-1",
          entityType: "task",
          observations: [
            "title:Test task delegation",
            "status:pending",
            "created_by:agent-test-1"
          ]
        },
        {
          name: "resource-test-1",
          entityType: "resource",
          observations: [
            "type:database",
            "status:available",
            "owner:agent-test-1"
          ]
        }
      ],
      relations: [
        { from: "agent-test-1", to: "task-test-1", relationType: "created" },
        { from: "agent-test-1", to: "resource-test-1", relationType: "owns" }
      ]
    };
    mockReadFile.mockResolvedValue(JSON.stringify(initialData));
  });

  describe("Agent Management Tools", () => {
    it("should register agent via create_entities", async () => {
      const agentData = {
        name: "agent-new",
        entityType: "agent",
        observations: [
          "status:active",
          "capabilities:data-processing",
          "registered_at:2024-01-15T12:00:00Z"
        ]
      };

      const result = await manager.createEntities([agentData]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]?.name).toBe("agent-new");
      expect(result[0]?.entityType).toBe("agent");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should update agent status via add_observations", async () => {
      const statusUpdate = {
        entityName: "agent-test-1",
        contents: ["status:busy", "current_task:processing-data"]
      };

      const result = await manager.addObservations([statusUpdate]);

      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should discover agents via search_nodes", async () => {
      const result = await manager.searchNodes("entityType:agent");

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
      expect(Array.isArray(result.entities)).toBe(true);
    });

    it("should get agent details via open_nodes", async () => {
      const result = await manager.openNodes(["agent-test-1"]);

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe("Task Delegation Tools", () => {
    it("should delegate task via create_entities", async () => {
      const taskData = {
        name: "task-delegated",
        entityType: "task",
        observations: [
          "title:Delegated processing task",
          "status:pending",
          "delegated_by:agent-test-1",
          "delegated_to:agent-test-2",
          "created_at:2024-01-15T13:00:00Z"
        ]
      };

      const result = await manager.createEntities([taskData]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]?.name).toBe("task-delegated");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should accept delegation via add_observations", async () => {
      const acceptanceData = {
        entityName: "task-test-1",
        contents: [
          "status:accepted",
          "accepted_by:agent-test-2",
          "accepted_at:2024-01-15T13:30:00Z"
        ]
      };

      const result = await manager.addObservations([acceptanceData]);

      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should get delegations via search_nodes", async () => {
      const result = await manager.searchNodes("delegated_to:agent-test-2");

      expect(result).toHaveProperty("entities");
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe("Resource Sharing Tools", () => {
    it("should share resource via create_entities", async () => {
      const shareData = {
        name: "share-001",
        entityType: "resource_share",
        observations: [
          "resource_id:resource-test-1",
          "shared_by:agent-test-1",
          "shared_with:agent-test-2",
          "permissions:read",
          "shared_at:2024-01-15T14:00:00Z"
        ]
      };

      const result = await manager.createEntities([shareData]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]?.entityType).toBe("resource_share");
    });

    it("should revoke sharing via delete_entities", async () => {
      const result = await manager.deleteEntities(["share-001"]);

      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should get shared resources via search_nodes", async () => {
      const result = await manager.searchNodes("shared_with:agent-test-1");

      expect(result).toHaveProperty("entities");
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe("Workflow Coordination Tools", () => {
    it("should create workflow via create_entities", async () => {
      const workflowData = {
        name: "workflow-test",
        entityType: "workflow",
        observations: [
          "title:Test Workflow",
          "status:active",
          "created_by:agent-test-1",
          "participants:agent-test-1",
          "created_at:2024-01-15T15:00:00Z"
        ]
      };

      const result = await manager.createEntities([workflowData]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]?.entityType).toBe("workflow");
    });

    it("should join workflow via add_observations", async () => {
      const joinData = {
        entityName: "workflow-test",
        contents: [
          "participants:agent-test-1,agent-test-2",
          "joined_by:agent-test-2",
          "joined_at:2024-01-15T15:30:00Z"
        ]
      };

      const result = await manager.addObservations([joinData]);

      expect(result).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should get workflow participants via open_nodes", async () => {
      const result = await manager.openNodes(["workflow-test"]);

      expect(result).toHaveProperty("entities");
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe("Communication Tools", () => {
    it("should create message via create_entities", async () => {
      const messageData = {
        name: "message-001",
        entityType: "message",
        observations: [
          "from:agent-test-1",
          "to:agent-test-2",
          "content:Hello from agent 1",
          "timestamp:2024-01-15T16:00:00Z",
          "type:direct"
        ]
      };

      const result = await manager.createEntities([messageData]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]?.entityType).toBe("message");
    });

    it("should create event via create_entities", async () => {
      const eventData = {
        name: "event-001",
        entityType: "event",
        observations: [
          "type:task_completed",
          "source:agent-test-1",
          "task_id:task-test-1",
          "timestamp:2024-01-15T16:30:00Z"
        ]
      };

      const result = await manager.createEntities([eventData]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]?.entityType).toBe("event");
    });

    it("should get messages via search_nodes", async () => {
      const result = await manager.searchNodes("to:agent-test-2");

      expect(result).toHaveProperty("entities");
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe("Enhanced Query Tools", () => {
    it("should perform complex queries via search_nodes", async () => {
      const result = await manager.searchNodes(
        "entityType:agent AND status:active"
      );

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.relations)).toBe(true);
    });

    it("should get relationships via read_graph", async () => {
      const result = await manager.readGraph();

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.relations)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid entity creation", async () => {
      const invalidEntity = {
        name: "",
        entityType: "agent",
        observations: []
      };

      await expect(manager.createEntities([invalidEntity])).rejects.toThrow(
        "Entity name must be a non-empty string"
      );
    });

    it("should handle non-existent entity operations", async () => {
      const result = await manager.openNodes(["non-existent-entity"]);

      expect(result).toHaveProperty("entities");
      expect(result.entities).toHaveLength(0);
    });

    it("should handle empty search queries gracefully", async () => {
      const result = await manager.searchNodes("");

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
    });

    it("should handle malformed observations", async () => {
      const entityWithBadObs = {
        name: "test-bad-obs",
        entityType: "test",
        observations: ["malformed:observation:with:too:many:colons"]
      };

      const result = await manager.createEntities([entityWithBadObs]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe("Data Validation", () => {
    it("should validate entity structure", async () => {
      const validEntity = {
        name: "valid-entity",
        entityType: "test",
        observations: ["valid:observation"]
      };

      const result = await manager.createEntities([validEntity]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("entityType");
      expect(result[0]).toHaveProperty("observations");
    });

    it("should validate relation structure", async () => {
      const validRelation = {
        from: "agent-test-1",
        to: "task-test-1",
        relationType: "manages"
      };

      const result = await manager.createRelations([validRelation]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("from");
      expect(result[0]).toHaveProperty("to");
      expect(result[0]).toHaveProperty("relationType");
    });
  });

  describe("Performance Tests", () => {
    it("should handle batch operations efficiently", async () => {
      const batchEntities = Array.from({ length: 10 }, (_, i) => ({
        name: `batch-entity-${i}`,
        entityType: "test",
        observations: [`index:${i}`, `created:batch`]
      }));

      const result = await manager.createEntities(batchEntities);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(10);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should handle concurrent read operations", async () => {
      const operations = [
        manager.searchNodes("entityType:agent"),
        manager.searchNodes("entityType:task"),
        manager.searchNodes("entityType:resource")
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveProperty("entities");
        expect(result).toHaveProperty("relations");
      });
    });
  });
});
