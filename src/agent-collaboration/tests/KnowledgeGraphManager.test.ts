import { describe, it, expect, beforeEach, mock } from "bun:test";
import { KnowledgeGraphManager } from "../index.ts";

// Mock fs module using Bun's mock
const mockReadFile = mock(() => Promise.resolve(""));
const mockWriteFile = mock(() => Promise.resolve());

mock.module("fs", () => ({
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile
  }
}));

describe("KnowledgeGraphManager", () => {
  let manager: KnowledgeGraphManager;
  const testFilePath = "/test/memory.json";

  beforeEach(() => {
    manager = new KnowledgeGraphManager(testFilePath);
    mockReadFile.mockClear();
    mockWriteFile.mockClear();
  });

  describe("readGraph", () => {
    it("should load valid graph data from file", async () => {
      const mockData = {
        entities: [
          {
            name: "John",
            entityType: "person",
            observations: ["likes coffee"]
          }
        ],
        relations: [
          {
            from: "John",
            to: "Coffee",
            relationType: "likes"
          }
        ]
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await manager.readGraph();

      expect(result).toEqual(mockData);
      expect(mockReadFile).toHaveBeenCalledWith(testFilePath, "utf-8");
    });

    it("should return empty graph when file doesn't exist", async () => {
      const error = new Error("File not found") as Error & { code: string };
      error.code = "ENOENT";
      mockReadFile.mockRejectedValue(error);

      const result = await manager.readGraph();

      expect(result).toEqual({ entities: [], relations: [] });
    });

    it("should return empty graph when file is empty", async () => {
      mockReadFile.mockResolvedValue("");

      const result = await manager.readGraph();

      expect(result).toEqual({ entities: [], relations: [] });
    });

    it("should return empty graph when JSON is invalid", async () => {
      mockReadFile.mockResolvedValue("invalid json");

      const result = await manager.readGraph();

      expect(result).toEqual({ entities: [], relations: [] });
    });
  });

  describe("createEntities", () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ entities: [], relations: [] })
      );
      mockWriteFile.mockResolvedValue(undefined);
    });

    it("should create new entities successfully", async () => {
      const newEntities = [
        {
          name: "Alice",
          entityType: "person",
          observations: ["works remotely"]
        },
        {
          name: "Bob",
          entityType: "person",
          observations: ["likes tea"]
        }
      ];

      const result = await manager.createEntities(newEntities);

      expect(result).toEqual(newEntities);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should validate entity name is non-empty string", async () => {
      const invalidEntities = [
        {
          name: "",
          entityType: "person",
          observations: []
        }
      ];

      await expect(manager.createEntities(invalidEntities)).rejects.toThrow(
        "Entity name must be a non-empty string"
      );
    });

    it("should validate entity type is non-empty string", async () => {
      const invalidEntities = [
        {
          name: "Alice",
          entityType: "",
          observations: []
        }
      ];

      await expect(manager.createEntities(invalidEntities)).rejects.toThrow(
        "Entity type must be a non-empty string"
      );
    });
  });

  describe("searchNodes", () => {
    beforeEach(() => {
      const mockData = {
        entities: [
          {
            name: "John",
            entityType: "person",
            observations: ["likes coffee", "works at tech company"]
          },
          {
            name: "Coffee",
            entityType: "beverage",
            observations: ["caffeinated drink"]
          }
        ],
        relations: [
          {
            from: "John",
            to: "Coffee",
            relationType: "likes"
          }
        ]
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockData));
    });

    it("should search entities by name", async () => {
      const result = await manager.searchNodes("John");

      expect(result.entities.length).toBe(1);
      expect(result.entities[0]?.name).toBe("John");
    });

    it("should search entities by type", async () => {
      const result = await manager.searchNodes("person");

      expect(result.entities.length).toBe(1);
      expect(result.entities[0]?.entityType).toBe("person");
    });

    it("should search entities by observation content", async () => {
      const result = await manager.searchNodes("coffee");

      expect(result.entities.length).toBeGreaterThan(0);
    });

    it("should return empty graph for no matches", async () => {
      const result = await manager.searchNodes("nonexistent");

      expect(result.entities).toEqual([]);
      expect(result.relations).toEqual([]);
    });
  });

  describe("openNodes", () => {
    beforeEach(() => {
      const mockData = {
        entities: [
          {
            name: "John",
            entityType: "person",
            observations: ["likes coffee"]
          },
          {
            name: "Alice",
            entityType: "person",
            observations: ["works remotely"]
          }
        ],
        relations: []
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockData));
    });

    it("should return entities by names", async () => {
      const result = await manager.openNodes(["John", "Alice"]);

      expect(result.entities.length).toBe(2);
      expect(result.entities.map((e) => e.name)).toEqual(["John", "Alice"]);
    });

    it("should return empty graph for non-existent names", async () => {
      const result = await manager.openNodes(["NonExistent"]);

      expect(result.entities).toEqual([]);
      expect(result.relations).toEqual([]);
    });
  });
});
