import { describe, it, expect, beforeEach, mock } from "bun:test";
import { KnowledgeGraphManager } from "../index.js";

interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

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

describe("Server Integration Tests", () => {
  let manager: KnowledgeGraphManager;

  beforeEach(() => {
    manager = new KnowledgeGraphManager("/tmp/test-knowledge-graph.json");
  });

  describe("Tool Handler Simulation", () => {
    it("should handle create_entities tool", async () => {
      const entities = [
        {
          name: "TestEntity",
          entityType: "test",
          observations: ["Test observation"]
        }
      ];

      const result = await manager.createEntities(entities);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle read_graph tool", async () => {
      const result = await manager.readGraph();
      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
    });

    it("should handle search_nodes tool", async () => {
      const result = await manager.searchNodes("test");
      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
    });

    it("should handle open_nodes tool", async () => {
      const result = await manager.openNodes(["TestEntity"]);
      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
    });
  });

  describe("Error Handling", () => {
    it("should handle empty entity array gracefully", async () => {
      const result = await manager.createEntities([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle empty search queries", async () => {
      const result = await manager.searchNodes("");
      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("relations");
    });
  });

  describe("Business Logic Validation", () => {
    it("should validate entity name is required", async () => {
      const invalidEntity = {
        name: "",
        entityType: "test",
        observations: ["observation"]
      };

      await expect(manager.createEntities([invalidEntity])).rejects.toThrow(
        "Entity name must be a non-empty string"
      );
    });

    it("should validate entity type is required", async () => {
      const invalidEntity = {
        name: "Test",
        entityType: "",
        observations: ["observation"]
      };

      await expect(manager.createEntities([invalidEntity])).rejects.toThrow(
        "Entity type must be a non-empty string"
      );
    });

    it("should validate observations must be an array", async () => {
      const invalidEntity = {
        name: "Test",
        entityType: "test",
        observations: "not an array"
      } as unknown as Entity;

      await expect(manager.createEntities([invalidEntity])).rejects.toThrow(
        "Entity observations must be an array"
      );
    });

    it("should accept valid entity data", async () => {
      const validEntity = {
        name: "ValidTest",
        entityType: "test",
        observations: ["valid observation"]
      };

      const result = await manager.createEntities([validEntity]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validEntity);
    });
  });
});
