#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import minimist from "minimist";
import { isAbsolute } from "path";

// Parse args and handle paths safely
const argv = minimist(process.argv.slice(2));
let memoryPath = argv["memory-path"];

// If a custom path is provided, ensure it's absolute
// Before:
// if (memoryPath && !isAbsolute(memoryPath)) {
//   memoryPath = path.resolve(process.cwd(), memoryPath);
// }

// After:
if (memoryPath) {
  // Handle tilde expansion
  if (memoryPath.startsWith("~/")) {
    memoryPath = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      memoryPath.slice(2)
    );
  }
  if (!isAbsolute(memoryPath)) {
    memoryPath = path.resolve(process.cwd(), memoryPath);
  }
}

// Define the path to the JSON file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We are storing our memory using entities, relations, and observations in a graph structure
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  metadata?: Record<string, string | number | boolean>; // New: flexible metadata for agent collaboration
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string; // New: track which agent created this
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
  metadata?: Record<string, string | number | boolean>; // New: flexible metadata
  createdAt?: string;
  createdBy?: string;
}

// Enhanced interfaces for agent collaboration
interface AgentRegistration {
  agentId: string;
  agentType: string;
  status: "active" | "idle" | "busy" | "offline";
  capabilities: string[];
  currentTask?: string;
  lastSeen: string;
  metadata?: Record<string, string | number | boolean>;
}

// Unused interfaces removed to fix linter errors

// Backward compatibility type
interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
export class KnowledgeGraphManager {
  private memoryFilePath: string;

  constructor(memoryFilePath: string) {
    this.memoryFilePath = memoryFilePath;
  }
  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(this.memoryFilePath, "utf-8");
      if (!data.trim()) {
        return { entities: [], relations: [] };
      }
      const graph = JSON.parse(data) as KnowledgeGraph;
      return {
        entities: Array.isArray(graph.entities)
          ? graph.entities.map((e) => ({
              ...e,
              observations: Array.isArray(e.observations) ? e.observations : [],
              metadata: e.metadata || {},
              createdAt: e.createdAt || new Date().toISOString(),
              updatedAt: e.updatedAt || new Date().toISOString()
            }))
          : [],
        relations: Array.isArray(graph.relations) ? graph.relations : []
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (("code" in error &&
          (error as Error & { code: string }).code === "ENOENT") ||
          error.name === "SyntaxError")
      ) {
        return { entities: [], relations: [] };
      }
      throw error;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    // Create a clean graph object
    const jsonGraph = {
      entities: graph.entities.map(({ name, entityType, observations }) => ({
        name,
        entityType,
        observations
      })),
      relations: graph.relations.map(({ from, to, relationType }) => ({
        from,
        to,
        relationType
      }))
    };

    await fs.writeFile(this.memoryFilePath, JSON.stringify(jsonGraph, null, 2));
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    // Validate entities
    for (const entity of entities) {
      if (!entity.name || typeof entity.name !== "string") {
        throw new Error("Entity name must be a non-empty string");
      }
      if (!entity.entityType || typeof entity.entityType !== "string") {
        throw new Error("Entity type must be a non-empty string");
      }
      if (!Array.isArray(entity.observations)) {
        throw new Error("Entity observations must be an array");
      }
    }
    const graph = await this.loadGraph();
    const existingNames = new Set(graph.entities.map((e) => e.name));
    const newEntities: Entity[] = [];
    for (const e of entities) {
      if (!existingNames.has(e.name)) {
        newEntities.push(e);
        existingNames.add(e.name);
      }
    }
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const existingRelations = new Set(
      graph.relations.map((r) => `${r.from}|${r.to}|${r.relationType}`)
    );
    const newRelations: Relation[] = [];
    for (const r of relations) {
      const key = `${r.from}|${r.to}|${r.relationType}`;
      if (!existingRelations.has(key)) {
        newRelations.push(r);
        existingRelations.add(key);
      }
    }
    graph.relations.push(...newRelations);
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(
    observations: { entityName: string; contents: string[] }[]
  ): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results = observations.map((o) => {
      const entity = graph.entities.find((e) => e.name === o.entityName);
      if (!entity) {
        console.error(`Entity with name ${o.entityName} not found`);
        return {
          entityName: o.entityName,
          addedObservations: [],
          error: "Entity not found"
        };
      }
      const newObservations = o.contents.filter(
        (content) => !entity.observations.includes(content)
      );
      entity.observations.push(...newObservations);
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(entityNames: string[]): Promise<number> {
    const graph = await this.loadGraph();
    const setToDelete = new Set(entityNames);
    const initialLength = graph.entities.length;
    graph.entities = graph.entities.filter((e) => !setToDelete.has(e.name));
    graph.relations = graph.relations.filter(
      (r) => !setToDelete.has(r.from) && !setToDelete.has(r.to)
    );
    await this.saveGraph(graph);
    return initialLength - graph.entities.length;
  }

  async deleteObservations(
    deletions: { entityName: string; observations: string[] }[]
  ): Promise<void> {
    const graph = await this.loadGraph();
    deletions.forEach((d) => {
      const entity = graph.entities.find((e) => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(
          (o) => !d.observations.includes(o)
        );
      }
    });
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.relations = graph.relations.filter(
      (r) =>
        !relations.some(
          (delRelation) =>
            r.from === delRelation.from &&
            r.to === delRelation.to &&
            r.relationType === delRelation.relationType
        )
    );
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  // Very basic search function
  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Filter entities
    const filteredEntities = graph.entities.filter(
      (e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.entityType.toLowerCase().includes(query.toLowerCase()) ||
        e.observations.some((o) =>
          o.toLowerCase().includes(query.toLowerCase())
        )
    );

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(
      (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations
    };

    return filteredGraph;
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Filter entities
    const filteredEntities = graph.entities.filter((e) =>
      names.includes(e.name)
    );

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(
      (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations
    };

    return filteredGraph;
  }

  // Agent Management Methods
  async registerAgent(agent: AgentRegistration): Promise<AgentRegistration> {
    const graph = await this.loadGraph();
    const agentEntity: Entity = {
      name: agent.agentId,
      entityType: "agent",
      observations: [
        `Agent registered with type: ${agent.agentType}`,
        `Status: ${agent.status}`
      ],
      metadata: {
        agentType: agent.agentType,
        status: agent.status,
        capabilities: agent.capabilities.join(","),
        currentTask: agent.currentTask || "",
        lastSeen: agent.lastSeen
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: agent.agentId
    };

    // Check if agent already exists
    const existingAgent = graph.entities.find(
      (e) => e.name === agent.agentId && e.entityType === "agent"
    );
    if (existingAgent) {
      // Update existing agent
      existingAgent.metadata = agentEntity.metadata;
      existingAgent.updatedAt = new Date().toISOString();
      existingAgent.observations.push(
        `Agent updated at ${new Date().toISOString()}`
      );
    } else {
      graph.entities.push(agentEntity);
    }

    await this.saveGraph(graph);
    return agent;
  }

  async updateAgentStatus(
    agentId: string,
    status: "active" | "idle" | "busy" | "offline",
    currentTask?: string
  ): Promise<void> {
    const graph = await this.loadGraph();
    const agent = graph.entities.find(
      (e) => e.name === agentId && e.entityType === "agent"
    );

    if (!agent || !agent.metadata) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.metadata.status = status;
    agent.metadata.lastSeen = new Date().toISOString();
    if (currentTask) {
      agent.metadata.currentTask = currentTask;
    }
    agent.updatedAt = new Date().toISOString();
    agent.observations.push(
      `Status updated to ${status} at ${new Date().toISOString()}`
    );

    await this.saveGraph(graph);
  }

  async getAgentInfo(agentId: string): Promise<AgentRegistration | null> {
    const graph = await this.loadGraph();
    const agent = graph.entities.find(
      (e) => e.name === agentId && e.entityType === "agent"
    );

    if (!agent || !agent.metadata) {
      return null;
    }

    return {
      agentId: agent.name,
      agentType: agent.metadata.agentType as string,
      status: agent.metadata.status as "active" | "idle" | "busy" | "offline",
      capabilities: (agent.metadata.capabilities as string)
        .split(",")
        .filter((c) => c.length > 0),
      currentTask: (agent.metadata.currentTask as string) || undefined,
      lastSeen: agent.metadata.lastSeen as string,
      metadata: agent.metadata
    };
  }

  async listActiveAgents(): Promise<AgentRegistration[]> {
    const graph = await this.loadGraph();
    const agentEntities = graph.entities.filter(
      (e) => e.entityType === "agent" && e.metadata?.status !== "offline"
    );

    return agentEntities.map((agent) => ({
      agentId: agent.name,
      agentType: agent.metadata!.agentType as string,
      status: agent.metadata!.status as "active" | "idle" | "busy" | "offline",
      capabilities: (agent.metadata!.capabilities as string)
        .split(",")
        .filter((c) => c.length > 0),
      currentTask: (agent.metadata!.currentTask as string) || undefined,
      lastSeen: agent.metadata!.lastSeen as string,
      metadata: agent.metadata
    }));
  }

  // Workflow Coordination Methods
  async createWorkflow(
    workflowId: string,
    requestId: string,
    participatingAgents: string[]
  ): Promise<void> {
    const graph = await this.loadGraph();
    const workflowEntity: Entity = {
      name: workflowId,
      entityType: "workflow",
      observations: [
        `Workflow created for request: ${requestId}`,
        `Participating agents: ${participatingAgents.join(", ")}`
      ],
      metadata: {
        requestId,
        status: "active",
        participatingAgents: participatingAgents.join(","),
        createdAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    graph.entities.push(workflowEntity);

    // Create relations between workflow and participating agents
    const workflowRelations: Relation[] = participatingAgents.map(
      (agentId) => ({
        from: workflowId,
        to: agentId,
        relationType: "involves_agent",
        createdAt: new Date().toISOString()
      })
    );

    graph.relations.push(...workflowRelations);
    await this.saveGraph(graph);
  }

  async assignTaskToAgent(
    taskId: string,
    agentId: string,
    taskDescription: string
  ): Promise<void> {
    const graph = await this.loadGraph();

    // Create task entity
    const taskEntity: Entity = {
      name: taskId,
      entityType: "task",
      observations: [
        `Task assigned to agent: ${agentId}`,
        `Description: ${taskDescription}`
      ],
      metadata: {
        assignedTo: agentId,
        status: "assigned",
        description: taskDescription,
        assignedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    graph.entities.push(taskEntity);

    // Create relation between task and agent
    const taskRelation: Relation = {
      from: taskId,
      to: agentId,
      relationType: "assigned_to",
      createdAt: new Date().toISOString()
    };

    graph.relations.push(taskRelation);
    await this.saveGraph(graph);
  }

  async getAgentTasks(agentId: string): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const taskRelations = graph.relations.filter(
      (r) => r.to === agentId && r.relationType === "assigned_to"
    );
    const taskIds = taskRelations.map((r) => r.from);

    return graph.entities.filter(
      (e) => taskIds.includes(e.name) && e.entityType === "task"
    );
  }

  // Communication Methods
  async sendAgentMessage(
    fromAgent: string,
    toAgent: string,
    messageContent: string
  ): Promise<void> {
    const graph = await this.loadGraph();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const messageEntity: Entity = {
      name: messageId,
      entityType: "communication",
      observations: [
        `Message from ${fromAgent} to ${toAgent}`,
        `Content: ${messageContent}`
      ],
      metadata: {
        fromAgent,
        toAgent,
        content: messageContent,
        timestamp: new Date().toISOString(),
        status: "sent"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: fromAgent
    };

    graph.entities.push(messageEntity);

    // Create relations
    const relations: Relation[] = [
      {
        from: messageId,
        to: fromAgent,
        relationType: "sent_by",
        createdAt: new Date().toISOString()
      },
      {
        from: messageId,
        to: toAgent,
        relationType: "sent_to",
        createdAt: new Date().toISOString()
      }
    ];

    graph.relations.push(...relations);
    await this.saveGraph(graph);
  }

  async getAgentMessages(agentId: string): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const messageRelations = graph.relations.filter(
      (r) =>
        r.to === agentId &&
        (r.relationType === "sent_to" || r.relationType === "sent_by")
    );
    const messageIds = messageRelations.map((r) => r.from);

    return graph.entities.filter(
      (e) => messageIds.includes(e.name) && e.entityType === "communication"
    );
  }

  // Enhanced Communication Methods
  async discoverAgents(
    capabilities?: string[],
    agentType?: string
  ): Promise<AgentRegistration[]> {
    const graph = await this.loadGraph();

    let agents = graph.entities.filter((e) => e.entityType === "agent");

    // Filter by capabilities if specified
    if (capabilities && capabilities.length > 0) {
      agents = agents.filter((e) => {
        const agentCapabilities = e.metadata?.capabilities as string;
        if (!agentCapabilities) return false;
        const caps = agentCapabilities.split(",");
        return capabilities.some((cap) => caps.includes(cap));
      });
    }

    // Filter by agent type if specified
    if (agentType) {
      agents = agents.filter((e) => e.metadata?.agentType === agentType);
    }

    // Convert to AgentRegistration format
    return agents.map((e) => ({
      agentId: e.name,
      agentType: e.metadata!.agentType as string,
      status: e.metadata!.status as "active" | "idle" | "busy" | "offline",
      capabilities: (e.metadata!.capabilities as string)
        .split(",")
        .filter((c) => c.length > 0),
      currentTask: (e.metadata!.currentTask as string) || undefined,
      lastSeen: e.metadata!.lastSeen as string,
      metadata: e.metadata
    }));
  }

  async broadcastMessage(
    fromAgent: string,
    messageContent: string,
    targetAgentTypes?: string[]
  ): Promise<string[]> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();
    const messageId = `broadcast_${fromAgent}_${Date.now()}`;

    // Find target agents
    let targetAgents = graph.entities.filter((e) => e.entityType === "agent");

    if (targetAgentTypes && targetAgentTypes.length > 0) {
      targetAgents = targetAgents.filter((e) =>
        targetAgentTypes.includes(e.metadata?.agentType as string)
      );
    }

    // Create broadcast message entity
    const broadcastEntity: Entity = {
      name: messageId,
      entityType: "communication",
      observations: [
        `Broadcast message from ${fromAgent}`,
        `Content: ${messageContent}`,
        `Recipients: ${targetAgents.map((a) => a.name).join(", ")}`
      ],
      metadata: {
        messageType: "broadcast",
        fromAgent,
        content: messageContent,
        timestamp,
        recipients: targetAgents.map((a) => a.name).join(",")
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: fromAgent
    };

    // Create relations to all target agents
    const relations: Relation[] = targetAgents.map((agent) => ({
      from: messageId,
      to: agent.name,
      relationType: "sent_to",
      metadata: { messageType: "broadcast" },
      createdAt: timestamp,
      createdBy: fromAgent
    }));

    // Save to graph
    graph.entities.push(broadcastEntity);
    graph.relations.push(...relations);
    await this.saveGraph(graph);

    return targetAgents.map((a) => a.name);
  }

  async subscribeToEvents(
    agentId: string,
    eventTypes: string[]
  ): Promise<void> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();

    // Create or update agent's event subscription
    const subscriptionEntity: Entity = {
      name: `subscription_${agentId}`,
      entityType: "subscription",
      observations: [
        `Agent ${agentId} subscribed to events`,
        `Event types: ${eventTypes.join(", ")}`,
        `Subscribed at: ${timestamp}`
      ],
      metadata: {
        subscriptionType: "events",
        agentId,
        eventTypes: eventTypes.join(","),
        subscribedAt: timestamp
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: agentId
    };

    // Remove existing subscription if any
    const existingIndex = graph.entities.findIndex(
      (e) => e.name === `subscription_${agentId}`
    );
    if (existingIndex !== -1) {
      graph.entities[existingIndex] = subscriptionEntity;
    } else {
      graph.entities.push(subscriptionEntity);
    }

    await this.saveGraph(graph);
  }

  async publishEvent(
    publisherAgent: string,
    eventType: string,
    eventData: Record<string, string | number | boolean>
  ): Promise<string[]> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();
    const eventId = `event_${eventType}_${Date.now()}`;

    // Find subscribers to this event type
    const subscribers = graph.entities.filter(
      (e) =>
        e.entityType === "subscription" &&
        e.metadata?.eventTypes &&
        (e.metadata.eventTypes as string).split(",").includes(eventType)
    );

    // Create event entity
    const eventEntity: Entity = {
      name: eventId,
      entityType: "event",
      observations: [
        `Event published by ${publisherAgent}`,
        `Event type: ${eventType}`,
        `Timestamp: ${timestamp}`,
        ...Object.entries(eventData).map(([key, value]) => `${key}: ${value}`)
      ],
      metadata: {
        eventType,
        publisher: publisherAgent,
        timestamp,
        ...eventData
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: publisherAgent
    };

    // Create relations to subscribers
    const subscriberAgents = subscribers
      .map((s) => s.metadata?.agentId as string)
      .filter(Boolean);

    const relations: Relation[] = subscriberAgents.map((agentId) => ({
      from: eventId,
      to: agentId,
      relationType: "notified",
      metadata: { eventType },
      createdAt: timestamp,
      createdBy: publisherAgent
    }));

    // Save to graph
    graph.entities.push(eventEntity);
    graph.relations.push(...relations);
    await this.saveGraph(graph);

    return subscriberAgents;
  }

  async getAgentEvents(
    agentId: string,
    eventTypes?: string[]
  ): Promise<Entity[]> {
    const graph = await this.loadGraph();

    // Find events where this agent was notified
    const eventRelations = graph.relations.filter(
      (r) => r.to === agentId && r.relationType === "notified"
    );

    let events = graph.entities.filter(
      (e) =>
        e.entityType === "event" &&
        eventRelations.some((r) => r.from === e.name)
    );

    // Filter by event types if specified
    if (eventTypes && eventTypes.length > 0) {
      events = events.filter((e) =>
        eventTypes.includes(e.metadata?.eventType as string)
      );
    }

    return events;
  }

  async createCommunicationChannel(
    channelId: string,
    creatorAgent: string,
    participants: string[],
    channelType: "direct" | "group" | "broadcast" = "group"
  ): Promise<void> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();

    // Create channel entity
    const channelEntity: Entity = {
      name: channelId,
      entityType: "channel",
      observations: [
        `Communication channel created by ${creatorAgent}`,
        `Channel type: ${channelType}`,
        `Participants: ${participants.join(", ")}`,
        `Created at: ${timestamp}`
      ],
      metadata: {
        channelType,
        creator: creatorAgent,
        participants: participants.join(","),
        participantCount: participants.length,
        createdAt: timestamp
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: creatorAgent
    };

    // Create relations to participants
    const relations: Relation[] = participants.map((participant) => ({
      from: channelId,
      to: participant,
      relationType: "includes",
      metadata: {
        role: participant === creatorAgent ? "creator" : "participant"
      },
      createdAt: timestamp,
      createdBy: creatorAgent
    }));

    graph.entities.push(channelEntity);
    graph.relations.push(...relations);
    await this.saveGraph(graph);
  }

  async sendChannelMessage(
    channelId: string,
    fromAgent: string,
    messageContent: string
  ): Promise<void> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();
    const messageId = `msg_${channelId}_${Date.now()}`;

    // Verify agent is participant in channel
    const isParticipant = graph.relations.some(
      (r) =>
        r.from === channelId &&
        r.to === fromAgent &&
        r.relationType === "includes"
    );

    if (!isParticipant) {
      throw new Error(
        `Agent ${fromAgent} is not a participant in channel ${channelId}`
      );
    }

    // Create message entity
    const messageEntity: Entity = {
      name: messageId,
      entityType: "communication",
      observations: [
        `Channel message from ${fromAgent}`,
        `Channel: ${channelId}`,
        `Content: ${messageContent}`,
        `Timestamp: ${timestamp}`
      ],
      metadata: {
        messageType: "channel",
        channelId,
        fromAgent,
        content: messageContent,
        timestamp
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: fromAgent
    };

    // Create relation to channel
    const relation: Relation = {
      from: messageId,
      to: channelId,
      relationType: "sent_in",
      metadata: {},
      createdAt: timestamp,
      createdBy: fromAgent
    };

    graph.entities.push(messageEntity);
    graph.relations.push(relation);
    await this.saveGraph(graph);
  }

  async getChannelMessages(
    channelId: string,
    limit?: number
  ): Promise<Entity[]> {
    const graph = await this.loadGraph();

    // Find messages sent in this channel
    const messageRelations = graph.relations.filter(
      (r) => r.to === channelId && r.relationType === "sent_in"
    );

    let messages = graph.entities.filter(
      (e) =>
        e.entityType === "communication" &&
        messageRelations.some((r) => r.from === e.name)
    );

    // Sort by timestamp (newest first)
    messages.sort((a, b) => {
      const aTime = (a.metadata?.timestamp as string) || a.createdAt || "";
      const bTime = (b.metadata?.timestamp as string) || b.createdAt || "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    // Apply limit if specified
    if (limit && limit > 0) {
      messages = messages.slice(0, limit);
    }

    return messages;
  }

  // Agent Collaboration Utilities

  // Task Delegation Utilities
  async delegateTask(
    fromAgent: string,
    toAgent: string,
    taskId: string,
    priority: "low" | "medium" | "high" = "medium",
    deadline?: string
  ): Promise<void> {
    const graph = await this.loadGraph();

    // Check if target agent exists and is available
    const targetAgent = await this.getAgentInfo(toAgent);
    if (!targetAgent) {
      throw new Error(`Target agent ${toAgent} not found`);
    }

    if (targetAgent.status === "offline") {
      throw new Error(`Target agent ${toAgent} is offline`);
    }

    // Create delegation entity
    const delegationId = `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const delegationEntity: Entity = {
      name: delegationId,
      entityType: "task_delegation",
      observations: [
        `Task ${taskId} delegated from ${fromAgent} to ${toAgent}`,
        `Priority: ${priority}`,
        deadline ? `Deadline: ${deadline}` : "No deadline specified"
      ],
      metadata: {
        fromAgent,
        toAgent,
        taskId,
        priority,
        deadline: deadline || "",
        status: "delegated",
        delegatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: fromAgent
    };

    graph.entities.push(delegationEntity);

    // Create relations
    const relations: Relation[] = [
      {
        from: delegationId,
        to: fromAgent,
        relationType: "delegated_by",
        createdAt: new Date().toISOString(),
        createdBy: fromAgent
      },
      {
        from: delegationId,
        to: toAgent,
        relationType: "delegated_to",
        createdAt: new Date().toISOString(),
        createdBy: fromAgent
      },
      {
        from: delegationId,
        to: taskId,
        relationType: "delegates_task",
        createdAt: new Date().toISOString(),
        createdBy: fromAgent
      }
    ];

    graph.relations.push(...relations);

    // Update target agent status if they were idle
    if (targetAgent.status === "idle") {
      await this.updateAgentStatus(toAgent, "busy", taskId);
    }

    await this.saveGraph(graph);
  }

  async acceptDelegation(agentId: string, delegationId: string): Promise<void> {
    const graph = await this.loadGraph();
    const delegation = graph.entities.find(
      (e) => e.name === delegationId && e.entityType === "task_delegation"
    );

    if (!delegation || !delegation.metadata) {
      throw new Error(`Delegation ${delegationId} not found`);
    }

    if (delegation.metadata.toAgent !== agentId) {
      throw new Error(
        `Delegation ${delegationId} is not assigned to agent ${agentId}`
      );
    }

    delegation.metadata.status = "accepted";
    delegation.metadata.acceptedAt = new Date().toISOString();
    delegation.updatedAt = new Date().toISOString();
    delegation.observations.push(
      `Delegation accepted by ${agentId} at ${new Date().toISOString()}`
    );

    await this.updateAgentStatus(
      agentId,
      "busy",
      delegation.metadata.taskId as string
    );
    await this.saveGraph(graph);
  }

  async rejectDelegation(
    agentId: string,
    delegationId: string,
    reason?: string
  ): Promise<void> {
    const graph = await this.loadGraph();
    const delegation = graph.entities.find(
      (e) => e.name === delegationId && e.entityType === "task_delegation"
    );

    if (!delegation || !delegation.metadata) {
      throw new Error(`Delegation ${delegationId} not found`);
    }

    if (delegation.metadata.toAgent !== agentId) {
      throw new Error(
        `Delegation ${delegationId} is not assigned to agent ${agentId}`
      );
    }

    delegation.metadata.status = "rejected";
    delegation.metadata.rejectedAt = new Date().toISOString();
    delegation.metadata.rejectionReason = reason || "No reason provided";
    delegation.updatedAt = new Date().toISOString();
    delegation.observations.push(
      `Delegation rejected by ${agentId} at ${new Date().toISOString()}${reason ? `: ${reason}` : ""}`
    );

    await this.saveGraph(graph);
  }

  async getAgentDelegations(
    agentId: string,
    status?: string
  ): Promise<Entity[]> {
    const graph = await this.loadGraph();
    let delegations = graph.entities.filter(
      (e) =>
        e.entityType === "task_delegation" &&
        (e.metadata?.toAgent === agentId || e.metadata?.fromAgent === agentId)
    );

    if (status) {
      delegations = delegations.filter((d) => d.metadata?.status === status);
    }

    return delegations;
  }

  // Resource Sharing Utilities
  async shareResource(
    fromAgent: string,
    toAgent: string,
    resourceId: string,
    resourceType: string,
    accessLevel: "read" | "write" | "admin" = "read",
    expiresAt?: string
  ): Promise<void> {
    const graph = await this.loadGraph();

    // Check if target agent exists
    const targetAgent = await this.getAgentInfo(toAgent);
    if (!targetAgent) {
      throw new Error(`Target agent ${toAgent} not found`);
    }

    // Create resource sharing entity
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shareEntity: Entity = {
      name: shareId,
      entityType: "resource_share",
      observations: [
        `Resource ${resourceId} shared from ${fromAgent} to ${toAgent}`,
        `Access level: ${accessLevel}`,
        `Resource type: ${resourceType}`,
        expiresAt ? `Expires at: ${expiresAt}` : "No expiration"
      ],
      metadata: {
        fromAgent,
        toAgent,
        resourceId,
        resourceType,
        accessLevel,
        expiresAt: expiresAt || "",
        status: "active",
        sharedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: fromAgent
    };

    graph.entities.push(shareEntity);

    // Create relations
    const relations: Relation[] = [
      {
        from: shareId,
        to: fromAgent,
        relationType: "shared_by",
        createdAt: new Date().toISOString(),
        createdBy: fromAgent
      },
      {
        from: shareId,
        to: toAgent,
        relationType: "shared_with",
        createdAt: new Date().toISOString(),
        createdBy: fromAgent
      },
      {
        from: shareId,
        to: resourceId,
        relationType: "shares_resource",
        createdAt: new Date().toISOString(),
        createdBy: fromAgent
      }
    ];

    graph.relations.push(...relations);
    await this.saveGraph(graph);
  }

  async revokeResourceShare(agentId: string, shareId: string): Promise<void> {
    const graph = await this.loadGraph();
    const share = graph.entities.find(
      (e) => e.name === shareId && e.entityType === "resource_share"
    );

    if (!share || !share.metadata) {
      throw new Error(`Resource share ${shareId} not found`);
    }

    if (share.metadata.fromAgent !== agentId) {
      throw new Error(`Only the sharing agent can revoke access`);
    }

    share.metadata.status = "revoked";
    share.metadata.revokedAt = new Date().toISOString();
    share.updatedAt = new Date().toISOString();
    share.observations.push(
      `Resource share revoked by ${agentId} at ${new Date().toISOString()}`
    );

    await this.saveGraph(graph);
  }

  async getSharedResources(
    agentId: string,
    accessLevel?: string
  ): Promise<Entity[]> {
    const graph = await this.loadGraph();
    let shares = graph.entities.filter(
      (e) =>
        e.entityType === "resource_share" &&
        e.metadata?.toAgent === agentId &&
        e.metadata?.status === "active"
    );

    // Check for expired shares
    const now = new Date();
    shares = shares.filter((share) => {
      if (share.metadata?.expiresAt) {
        const expiryDate = new Date(share.metadata.expiresAt as string);
        return expiryDate > now;
      }
      return true;
    });

    if (accessLevel) {
      shares = shares.filter((s) => s.metadata?.accessLevel === accessLevel);
    }

    return shares;
  }

  async getResourceShares(agentId: string): Promise<Entity[]> {
    const graph = await this.loadGraph();
    return graph.entities.filter(
      (e) =>
        e.entityType === "resource_share" && e.metadata?.fromAgent === agentId
    );
  }

  // Workflow Coordination Utilities
  async createCollaborativeWorkflow(
    workflowId: string,
    initiatorAgent: string,
    participantAgents: string[],
    workflowType: string,
    description: string
  ): Promise<void> {
    const graph = await this.loadGraph();

    // Verify all participant agents exist
    for (const agentId of participantAgents) {
      const agent = await this.getAgentInfo(agentId);
      if (!agent) {
        throw new Error(`Participant agent ${agentId} not found`);
      }
    }

    // Create workflow entity
    const workflowEntity: Entity = {
      name: workflowId,
      entityType: "collaborative_workflow",
      observations: [
        `Collaborative workflow initiated by ${initiatorAgent}`,
        `Type: ${workflowType}`,
        `Description: ${description}`,
        `Participants: ${participantAgents.join(", ")}`
      ],
      metadata: {
        initiatorAgent,
        workflowType,
        description,
        participants: participantAgents.join(","),
        status: "active",
        createdAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: initiatorAgent
    };

    graph.entities.push(workflowEntity);

    // Create relations between workflow and all participants
    const relations: Relation[] = participantAgents.map((agentId) => ({
      from: workflowId,
      to: agentId,
      relationType: "includes_participant",
      createdAt: new Date().toISOString(),
      createdBy: initiatorAgent
    }));

    // Add initiator relation
    relations.push({
      from: workflowId,
      to: initiatorAgent,
      relationType: "initiated_by",
      createdAt: new Date().toISOString(),
      createdBy: initiatorAgent
    });

    graph.relations.push(...relations);
    await this.saveGraph(graph);
  }

  async joinWorkflow(agentId: string, workflowId: string): Promise<void> {
    const graph = await this.loadGraph();
    const workflow = graph.entities.find(
      (e) => e.name === workflowId && e.entityType === "collaborative_workflow"
    );

    if (!workflow || !workflow.metadata) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.metadata.status !== "active") {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    // Check if agent is already a participant
    const existingRelation = graph.relations.find(
      (r) =>
        r.from === workflowId &&
        r.to === agentId &&
        r.relationType === "includes_participant"
    );

    if (existingRelation) {
      throw new Error(
        `Agent ${agentId} is already a participant in workflow ${workflowId}`
      );
    }

    // Add agent to participants
    const currentParticipants = (workflow.metadata.participants as string)
      .split(",")
      .filter((p) => p.length > 0);
    currentParticipants.push(agentId);
    workflow.metadata.participants = currentParticipants.join(",");
    workflow.updatedAt = new Date().toISOString();
    workflow.observations.push(
      `Agent ${agentId} joined workflow at ${new Date().toISOString()}`
    );

    // Create relation
    const relation: Relation = {
      from: workflowId,
      to: agentId,
      relationType: "includes_participant",
      createdAt: new Date().toISOString(),
      createdBy: agentId
    };

    graph.relations.push(relation);
    await this.saveGraph(graph);
  }

  async leaveWorkflow(agentId: string, workflowId: string): Promise<void> {
    const graph = await this.loadGraph();
    const workflow = graph.entities.find(
      (e) => e.name === workflowId && e.entityType === "collaborative_workflow"
    );

    if (!workflow || !workflow.metadata) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Remove agent from participants
    const currentParticipants = (workflow.metadata.participants as string)
      .split(",")
      .filter((p) => p.length > 0);
    const updatedParticipants = currentParticipants.filter(
      (p) => p !== agentId
    );
    workflow.metadata.participants = updatedParticipants.join(",");
    workflow.updatedAt = new Date().toISOString();
    workflow.observations.push(
      `Agent ${agentId} left workflow at ${new Date().toISOString()}`
    );

    // Remove relation
    const relationIndex = graph.relations.findIndex(
      (r) =>
        r.from === workflowId &&
        r.to === agentId &&
        r.relationType === "includes_participant"
    );

    if (relationIndex !== -1) {
      graph.relations.splice(relationIndex, 1);
    }

    await this.saveGraph(graph);
  }

  async updateWorkflowStatus(
    agentId: string,
    workflowId: string,
    status: "active" | "paused" | "completed" | "cancelled",
    statusReason?: string
  ): Promise<void> {
    const graph = await this.loadGraph();
    const workflow = graph.entities.find(
      (e) => e.name === workflowId && e.entityType === "collaborative_workflow"
    );

    if (!workflow || !workflow.metadata) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Check if agent is the initiator or a participant
    const isInitiator = workflow.metadata.initiatorAgent === agentId;
    const isParticipant = graph.relations.some(
      (r) =>
        r.from === workflowId &&
        r.to === agentId &&
        r.relationType === "includes_participant"
    );

    if (!isInitiator && !isParticipant) {
      throw new Error(
        `Agent ${agentId} is not authorized to update workflow ${workflowId}`
      );
    }

    workflow.metadata.status = status;
    workflow.metadata.statusUpdatedBy = agentId;
    workflow.metadata.statusUpdatedAt = new Date().toISOString();
    if (statusReason) {
      workflow.metadata.statusReason = statusReason;
    }
    workflow.updatedAt = new Date().toISOString();
    workflow.observations.push(
      `Workflow status updated to ${status} by ${agentId} at ${new Date().toISOString()}${statusReason ? `: ${statusReason}` : ""}`
    );

    await this.saveGraph(graph);
  }

  async getWorkflowParticipants(
    workflowId: string
  ): Promise<AgentRegistration[]> {
    const graph = await this.loadGraph();
    const participantRelations = graph.relations.filter(
      (r) => r.from === workflowId && r.relationType === "includes_participant"
    );

    const participants: AgentRegistration[] = [];
    for (const relation of participantRelations) {
      const agent = await this.getAgentInfo(relation.to);
      if (agent) {
        participants.push(agent);
      }
    }

    return participants;
  }

  async getAgentWorkflows(agentId: string, status?: string): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const workflowRelations = graph.relations.filter(
      (r) =>
        r.to === agentId &&
        (r.relationType === "includes_participant" ||
          r.relationType === "initiated_by")
    );

    let workflows = graph.entities.filter(
      (e) =>
        workflowRelations.some((r) => r.from === e.name) &&
        e.entityType === "collaborative_workflow"
    );

    if (status) {
      workflows = workflows.filter((w) => w.metadata?.status === status);
    }

    return workflows;
  }

  // Resource Management Methods
  async lockResource(
    resourceId: string,
    agentId: string,
    lockType: "exclusive" | "shared" = "exclusive"
  ): Promise<boolean> {
    const graph = await this.loadGraph();

    // Check if resource is already locked exclusively
    const existingLock = graph.entities.find(
      (e) =>
        e.entityType === "resource_lock" &&
        e.metadata?.resourceId === resourceId &&
        e.metadata?.lockType === "exclusive"
    );

    if (existingLock && lockType === "exclusive") {
      return false; // Cannot acquire exclusive lock
    }

    const lockId = `lock_${resourceId}_${agentId}_${Date.now()}`;
    const lockEntity: Entity = {
      name: lockId,
      entityType: "resource_lock",
      observations: [
        `Resource ${resourceId} locked by ${agentId}`,
        `Lock type: ${lockType}`
      ],
      metadata: {
        resourceId,
        lockedBy: agentId,
        lockType,
        lockedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: agentId
    };

    graph.entities.push(lockEntity);

    // Create relation
    const lockRelation: Relation = {
      from: lockId,
      to: agentId,
      relationType: "locked_by",
      createdAt: new Date().toISOString()
    };

    graph.relations.push(lockRelation);
    await this.saveGraph(graph);
    return true;
  }

  async unlockResource(resourceId: string, agentId: string): Promise<void> {
    const graph = await this.loadGraph();

    // Find and remove locks for this resource by this agent
    const locksToRemove = graph.entities.filter(
      (e) =>
        e.entityType === "resource_lock" &&
        e.metadata?.resourceId === resourceId &&
        e.metadata?.lockedBy === agentId
    );

    const lockIds = locksToRemove.map((lock) => lock.name);

    // Remove lock entities
    graph.entities = graph.entities.filter((e) => !lockIds.includes(e.name));

    // Remove related relations
    graph.relations = graph.relations.filter((r) => !lockIds.includes(r.from));

    await this.saveGraph(graph);
  }

  async checkResourceStatus(
    resourceId: string
  ): Promise<{ locked: boolean; lockedBy?: string; lockType?: string }> {
    const graph = await this.loadGraph();

    const activeLock = graph.entities.find(
      (e) =>
        e.entityType === "resource_lock" &&
        e.metadata?.resourceId === resourceId
    );

    if (!activeLock || !activeLock.metadata) {
      return { locked: false };
    }

    return {
      locked: true,
      lockedBy: activeLock.metadata.lockedBy as string,
      lockType: activeLock.metadata.lockType as string
    };
  }

  // Enhanced Query Methods
  async searchByAgent(agentId: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Find entities created or modified by the agent
    const agentEntities = graph.entities.filter((e) => e.createdBy === agentId);

    // Find relations involving the agent
    const agentRelations = graph.relations.filter(
      (r) => r.from === agentId || r.to === agentId || r.createdBy === agentId
    );

    return {
      entities: agentEntities,
      relations: agentRelations
    };
  }

  async searchByWorkflow(workflowId: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Find workflow entity
    const workflowEntity = graph.entities.find(
      (e) => e.name === workflowId && e.entityType === "workflow"
    );
    if (!workflowEntity) {
      return { entities: [], relations: [] };
    }

    // Find all entities and relations related to this workflow
    const workflowRelations = graph.relations.filter(
      (r) => r.from === workflowId || r.to === workflowId
    );
    const relatedEntityNames = new Set([workflowId]);

    workflowRelations.forEach((r) => {
      relatedEntityNames.add(r.from);
      relatedEntityNames.add(r.to);
    });

    const relatedEntities = graph.entities.filter((e) =>
      relatedEntityNames.has(e.name)
    );

    return {
      entities: relatedEntities,
      relations: workflowRelations
    };
  }
}

// The server instance and tools exposed to AI models
const server = new Server(
  {
    name: "knowledge-graph-memory-server",
    version: "0.0.2"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
const listToolsHandler = async () => {
  return { tools: Object.values(toolSchemas) };
};

// Tool argument interfaces
interface CreateEntitiesArgs {
  entities: Entity[];
}

interface CreateRelationsArgs {
  relations: Relation[];
}

interface AddObservationsArgs {
  observations: { entityName: string; contents: string[] }[];
}

interface DeleteEntitiesArgs {
  entityNames: string[];
}

interface DeleteObservationsArgs {
  deletions: { entityName: string; observations: string[] }[];
}

interface DeleteRelationsArgs {
  relations: Relation[];
}

interface SearchNodesArgs {
  query: string;
}

interface OpenNodesArgs {
  names: string[];
}

// Add proper type to request parameter
const callToolHandler = async (request: {
  params: { name: string; arguments?: Record<string, unknown> };
}) => {
  const memoryFilePath =
    memoryPath ||
    process.env.KNOWLEDGE_GRAPH_MEMORY_FILE ||
    path.join(__dirname, "collaboration.json");
  const manager = new KnowledgeGraphManager(memoryFilePath);
  const { name, arguments: args } = request.params;
  if (!args) throw new Error("No arguments provided");
  let result:
    | Entity[]
    | Relation[]
    | KnowledgeGraph
    | { entityName: string; addedObservations: string[] }[]
    | AgentRegistration
    | AgentRegistration[]
    | boolean
    | string
    | string[]
    | null
    | { locked: boolean; lockedBy?: string; lockType?: string };
  switch (name) {
    case "create_entities":
      result = await manager.createEntities(
        (args as unknown as CreateEntitiesArgs).entities
      );
      break;
    case "create_relations":
      result = await manager.createRelations(
        (args as unknown as CreateRelationsArgs).relations
      );
      break;
    case "add_observations":
      result = await manager.addObservations(
        (args as unknown as AddObservationsArgs).observations
      );
      break;
    case "delete_entities":
      await manager.deleteEntities(
        (args as unknown as DeleteEntitiesArgs).entityNames
      );
      result = "Entities deleted successfully";
      break;
    case "delete_observations":
      await manager.deleteObservations(
        (args as unknown as DeleteObservationsArgs).deletions
      );
      result = "Observations deleted successfully";
      break;
    case "delete_relations":
      await manager.deleteRelations(
        (args as unknown as DeleteRelationsArgs).relations
      );
      result = "Relations deleted successfully";
      break;
    case "read_graph":
      result = await manager.readGraph();
      break;
    case "search_nodes":
      result = await manager.searchNodes(
        (args as unknown as SearchNodesArgs).query
      );
      break;
    case "open_nodes":
      result = await manager.openNodes(
        (args as unknown as OpenNodesArgs).names
      );
      break;
    // Agent Management Tools
    case "register_agent":
      result = await manager.registerAgent(
        args as unknown as AgentRegistration
      );
      break;
    case "update_agent_status":
      await manager.updateAgentStatus(
        (
          args as {
            agentId: string;
            status: "active" | "idle" | "busy" | "offline";
            currentTask?: string;
          }
        ).agentId,
        (
          args as {
            agentId: string;
            status: "active" | "idle" | "busy" | "offline";
            currentTask?: string;
          }
        ).status,
        (
          args as {
            agentId: string;
            status: "active" | "idle" | "busy" | "offline";
            currentTask?: string;
          }
        ).currentTask
      );
      result = "Agent status updated successfully";
      break;
    case "get_agent_info":
      result = await manager.getAgentInfo(
        (args as { agentId: string }).agentId
      );
      if (!result) {
        result = "Agent not found";
      }
      break;
    case "list_active_agents":
      result = await manager.listActiveAgents();
      break;
    // Workflow Coordination Tools
    case "create_workflow":
      await manager.createWorkflow(
        (
          args as {
            workflowId: string;
            requestId: string;
            participatingAgents: string[];
          }
        ).workflowId,
        (
          args as {
            workflowId: string;
            requestId: string;
            participatingAgents: string[];
          }
        ).requestId,
        (
          args as {
            workflowId: string;
            requestId: string;
            participatingAgents: string[];
          }
        ).participatingAgents
      );
      result = "Workflow created successfully";
      break;
    case "assign_task_to_agent":
      await manager.assignTaskToAgent(
        (args as { taskId: string; agentId: string; taskDescription: string })
          .taskId,
        (args as { taskId: string; agentId: string; taskDescription: string })
          .agentId,
        (args as { taskId: string; agentId: string; taskDescription: string })
          .taskDescription
      );
      result = "Task assigned successfully";
      break;
    case "get_agent_tasks":
      result = await manager.getAgentTasks(
        (args as { agentId: string }).agentId
      );
      break;
    // Communication Tools
    case "send_agent_message":
      await manager.sendAgentMessage(
        (args as { fromAgent: string; toAgent: string; messageContent: string })
          .fromAgent,
        (args as { fromAgent: string; toAgent: string; messageContent: string })
          .toAgent,
        (args as { fromAgent: string; toAgent: string; messageContent: string })
          .messageContent
      );
      result = "Message sent successfully";
      break;
    case "get_agent_messages":
      result = await manager.getAgentMessages(
        (args as { agentId: string }).agentId
      );
      break;
    // Resource Management Tools
    case "lock_resource":
      result = await manager.lockResource(
        (
          args as {
            resourceId: string;
            agentId: string;
            lockType?: "exclusive" | "shared";
          }
        ).resourceId,
        (
          args as {
            resourceId: string;
            agentId: string;
            lockType?: "exclusive" | "shared";
          }
        ).agentId,
        (
          args as {
            resourceId: string;
            agentId: string;
            lockType?: "exclusive" | "shared";
          }
        ).lockType || "exclusive"
      );
      break;
    case "unlock_resource":
      await manager.unlockResource(
        (args as { resourceId: string; agentId: string }).resourceId,
        (args as { resourceId: string; agentId: string }).agentId
      );
      result = "Resource unlocked successfully";
      break;
    case "check_resource_status":
      result = await manager.checkResourceStatus(
        (args as { resourceId: string }).resourceId
      );
      break;
    // Enhanced Query Tools
    case "search_by_agent":
      result = await manager.searchByAgent(
        (args as { agentId: string }).agentId
      );
      break;
    case "search_by_workflow":
      result = await manager.searchByWorkflow(
        (args as { workflowId: string }).workflowId
      );
      break;
    // Enhanced Communication Tools
    case "discover_agents":
      result = await manager.discoverAgents(
        (args as { capabilities?: string[]; agentType?: string }).capabilities,
        (args as { capabilities?: string[]; agentType?: string }).agentType
      );
      break;
    case "broadcast_message":
      result = await manager.broadcastMessage(
        (
          args as {
            fromAgent: string;
            messageContent: string;
            targetAgentTypes?: string[];
          }
        ).fromAgent,
        (
          args as {
            fromAgent: string;
            messageContent: string;
            targetAgentTypes?: string[];
          }
        ).messageContent,
        (
          args as {
            fromAgent: string;
            messageContent: string;
            targetAgentTypes?: string[];
          }
        ).targetAgentTypes
      );
      break;
    case "subscribe_to_events":
      await manager.subscribeToEvents(
        (args as { agentId: string; eventTypes: string[] }).agentId,
        (args as { agentId: string; eventTypes: string[] }).eventTypes
      );
      result = "Successfully subscribed to events";
      break;
    case "publish_event":
      result = await manager.publishEvent(
        (
          args as {
            publisherAgent: string;
            eventType: string;
            eventData: Record<string, string | number | boolean>;
          }
        ).publisherAgent,
        (
          args as {
            publisherAgent: string;
            eventType: string;
            eventData: Record<string, string | number | boolean>;
          }
        ).eventType,
        (
          args as {
            publisherAgent: string;
            eventType: string;
            eventData: Record<string, string | number | boolean>;
          }
        ).eventData
      );
      break;
    case "get_agent_events":
      result = await manager.getAgentEvents(
        (args as { agentId: string; eventTypes?: string[] }).agentId,
        (args as { agentId: string; eventTypes?: string[] }).eventTypes
      );
      break;
    case "create_communication_channel":
      await manager.createCommunicationChannel(
        (
          args as {
            channelId: string;
            creatorAgent: string;
            participants: string[];
            channelType?: "direct" | "group" | "broadcast";
          }
        ).channelId,
        (
          args as {
            channelId: string;
            creatorAgent: string;
            participants: string[];
            channelType?: "direct" | "group" | "broadcast";
          }
        ).creatorAgent,
        (
          args as {
            channelId: string;
            creatorAgent: string;
            participants: string[];
            channelType?: "direct" | "group" | "broadcast";
          }
        ).participants,
        (
          args as {
            channelId: string;
            creatorAgent: string;
            participants: string[];
            channelType?: "direct" | "group" | "broadcast";
          }
        ).channelType
      );
      result = "Communication channel created successfully";
      break;
    case "send_channel_message":
      await manager.sendChannelMessage(
        (
          args as {
            channelId: string;
            fromAgent: string;
            messageContent: string;
          }
        ).channelId,
        (
          args as {
            channelId: string;
            fromAgent: string;
            messageContent: string;
          }
        ).fromAgent,
        (
          args as {
            channelId: string;
            fromAgent: string;
            messageContent: string;
          }
        ).messageContent
      );
      result = "Channel message sent successfully";
      break;
    case "get_channel_messages":
      result = await manager.getChannelMessages(
        (args as { channelId: string; limit?: number }).channelId,
        (args as { channelId: string; limit?: number }).limit
      );
      break;
    // Task Delegation Tools
    case "delegate_task":
      await manager.delegateTask(
        (
          args as {
            fromAgent: string;
            toAgent: string;
            taskId: string;
            priority?: "low" | "medium" | "high";
            deadline?: string;
          }
        ).fromAgent,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            taskId: string;
            priority?: "low" | "medium" | "high";
            deadline?: string;
          }
        ).toAgent,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            taskId: string;
            priority?: "low" | "medium" | "high";
            deadline?: string;
          }
        ).taskId,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            taskId: string;
            priority?: "low" | "medium" | "high";
            deadline?: string;
          }
        ).priority,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            taskId: string;
            priority?: "low" | "medium" | "high";
            deadline?: string;
          }
        ).deadline
      );
      result = "Task delegated successfully";
      break;
    case "accept_delegation":
      await manager.acceptDelegation(
        (args as { agentId: string; delegationId: string }).agentId,
        (args as { agentId: string; delegationId: string }).delegationId
      );
      result = "Delegation accepted successfully";
      break;
    case "reject_delegation":
      await manager.rejectDelegation(
        (args as { agentId: string; delegationId: string; reason?: string })
          .agentId,
        (args as { agentId: string; delegationId: string; reason?: string })
          .delegationId,
        (args as { agentId: string; delegationId: string; reason?: string })
          .reason
      );
      result = "Delegation rejected successfully";
      break;
    case "get_agent_delegations":
      result = await manager.getAgentDelegations(
        (args as { agentId: string; status?: string }).agentId,
        (args as { agentId: string; status?: string }).status
      );
      break;
    // Resource Sharing Tools
    case "share_resource":
      await manager.shareResource(
        (
          args as {
            fromAgent: string;
            toAgent: string;
            resourceId: string;
            resourceType: string;
            accessLevel?: "read" | "write" | "admin";
            expiresAt?: string;
          }
        ).fromAgent,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            resourceId: string;
            resourceType: string;
            accessLevel?: "read" | "write" | "admin";
            expiresAt?: string;
          }
        ).toAgent,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            resourceId: string;
            resourceType: string;
            accessLevel?: "read" | "write" | "admin";
            expiresAt?: string;
          }
        ).resourceId,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            resourceId: string;
            resourceType: string;
            accessLevel?: "read" | "write" | "admin";
            expiresAt?: string;
          }
        ).resourceType,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            resourceId: string;
            resourceType: string;
            accessLevel?: "read" | "write" | "admin";
            expiresAt?: string;
          }
        ).accessLevel,
        (
          args as {
            fromAgent: string;
            toAgent: string;
            resourceId: string;
            resourceType: string;
            accessLevel?: "read" | "write" | "admin";
            expiresAt?: string;
          }
        ).expiresAt
      );
      result = "Resource shared successfully";
      break;
    case "revoke_resource_share":
      await manager.revokeResourceShare(
        (args as { agentId: string; shareId: string }).agentId,
        (args as { agentId: string; shareId: string }).shareId
      );
      result = "Resource share revoked successfully";
      break;
    case "get_shared_resources":
      result = await manager.getSharedResources(
        (args as { agentId: string; accessLevel?: string }).agentId,
        (args as { agentId: string; accessLevel?: string }).accessLevel
      );
      break;
    case "get_resource_shares":
      result = await manager.getResourceShares(
        (args as { agentId: string }).agentId
      );
      break;
    // Collaborative Workflow Tools
    case "create_collaborative_workflow":
      await manager.createCollaborativeWorkflow(
        (
          args as {
            workflowId: string;
            initiatorAgent: string;
            participantAgents: string[];
            workflowType: string;
            description: string;
          }
        ).workflowId,
        (
          args as {
            workflowId: string;
            initiatorAgent: string;
            participantAgents: string[];
            workflowType: string;
            description: string;
          }
        ).initiatorAgent,
        (
          args as {
            workflowId: string;
            initiatorAgent: string;
            participantAgents: string[];
            workflowType: string;
            description: string;
          }
        ).participantAgents,
        (
          args as {
            workflowId: string;
            initiatorAgent: string;
            participantAgents: string[];
            workflowType: string;
            description: string;
          }
        ).workflowType,
        (
          args as {
            workflowId: string;
            initiatorAgent: string;
            participantAgents: string[];
            workflowType: string;
            description: string;
          }
        ).description
      );
      result = "Collaborative workflow created successfully";
      break;
    case "join_workflow":
      await manager.joinWorkflow(
        (args as { agentId: string; workflowId: string }).agentId,
        (args as { agentId: string; workflowId: string }).workflowId
      );
      result = "Joined workflow successfully";
      break;
    case "leave_workflow":
      await manager.leaveWorkflow(
        (args as { agentId: string; workflowId: string }).agentId,
        (args as { agentId: string; workflowId: string }).workflowId
      );
      result = "Left workflow successfully";
      break;
    case "update_workflow_status":
      await manager.updateWorkflowStatus(
        (
          args as {
            agentId: string;
            workflowId: string;
            status: "active" | "paused" | "completed" | "cancelled";
            statusReason?: string;
          }
        ).agentId,
        (
          args as {
            agentId: string;
            workflowId: string;
            status: "active" | "paused" | "completed" | "cancelled";
            statusReason?: string;
          }
        ).workflowId,
        (
          args as {
            agentId: string;
            workflowId: string;
            status: "active" | "paused" | "completed" | "cancelled";
            statusReason?: string;
          }
        ).status,
        (
          args as {
            agentId: string;
            workflowId: string;
            status: "active" | "paused" | "completed" | "cancelled";
            statusReason?: string;
          }
        ).statusReason
      );
      result = "Workflow status updated successfully";
      break;
    case "get_workflow_participants":
      result = await manager.getWorkflowParticipants(
        (args as { workflowId: string }).workflowId
      );
      break;
    case "get_agent_workflows":
      result = await manager.getAgentWorkflows(
        (args as { agentId: string; status?: string }).agentId,
        (args as { agentId: string; status?: string }).status
      );
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
  return {
    content: [
      { text: typeof result === "string" ? result : JSON.stringify(result) }
    ]
  };
};

// Register handlers with the server
server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
server.setRequestHandler(CallToolRequestSchema, callToolHandler);

export const testExports =
  process.env.NODE_ENV === "test" || process.env.VITEST
    ? { listToolsHandler, callToolHandler }
    : undefined;

// Define the main function
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent Collaboration MCP Server running");
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  main().catch((error: Error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}

const toolSchemas = {
  create_entities: {
    name: "create_entities",
    description: "Create multiple new entities",
    inputSchema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              entityType: { type: "string" },
              observations: { type: "array", items: { type: "string" } }
            },
            required: ["name", "entityType", "observations"]
          }
        }
      },
      required: ["entities"]
    }
  },
  create_relations: {
    name: "create_relations",
    description: "Create multiple new relations",
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationType: { type: "string" }
            },
            required: ["from", "to", "relationType"]
          }
        }
      },
      required: ["relations"]
    }
  },
  add_observations: {
    name: "add_observations",
    description: "Add observations to entities",
    inputSchema: {
      type: "object",
      properties: {
        observations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string" },
              contents: { type: "array", items: { type: "string" } }
            },
            required: ["entityName", "contents"]
          }
        }
      },
      required: ["observations"]
    }
  },
  delete_entities: {
    name: "delete_entities",
    description: "Delete entities",
    inputSchema: {
      type: "object",
      properties: { entityNames: { type: "array", items: { type: "string" } } },
      required: ["entityNames"]
    }
  },
  delete_observations: {
    name: "delete_observations",
    description: "Delete observations",
    inputSchema: {
      type: "object",
      properties: {
        deletions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string" },
              observations: { type: "array", items: { type: "string" } }
            },
            required: ["entityName", "observations"]
          }
        }
      },
      required: ["deletions"]
    }
  },
  delete_relations: {
    name: "delete_relations",
    description: "Delete relations",
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationType: { type: "string" }
            },
            required: ["from", "to", "relationType"]
          }
        }
      },
      required: ["relations"]
    }
  },
  read_graph: {
    name: "read_graph",
    description: "Read the entire graph",
    inputSchema: { type: "object", properties: {} }
  },
  search_nodes: {
    name: "search_nodes",
    description: "Search for nodes",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"]
    }
  },
  open_nodes: {
    name: "open_nodes",
    description: "Open specific nodes",
    inputSchema: {
      type: "object",
      properties: { names: { type: "array", items: { type: "string" } } },
      required: ["names"]
    }
  },
  // Agent Management Tools
  register_agent: {
    name: "register_agent",
    description: "Register a new agent in the knowledge graph",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        agentType: { type: "string" },
        status: { type: "string", enum: ["active", "idle", "busy", "offline"] },
        capabilities: { type: "array", items: { type: "string" } },
        currentTask: { type: "string" },
        lastSeen: { type: "string" }
      },
      required: ["agentId", "agentType", "status", "capabilities", "lastSeen"]
    }
  },
  update_agent_status: {
    name: "update_agent_status",
    description: "Update an agent's status and current task",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        status: { type: "string", enum: ["active", "idle", "busy", "offline"] },
        currentTask: { type: "string" }
      },
      required: ["agentId", "status"]
    }
  },
  get_agent_info: {
    name: "get_agent_info",
    description: "Get information about a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" }
      },
      required: ["agentId"]
    }
  },
  list_active_agents: {
    name: "list_active_agents",
    description: "List all active agents",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  // Workflow Coordination Tools
  create_workflow: {
    name: "create_workflow",
    description: "Create a new workflow with participating agents",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        requestId: { type: "string" },
        participatingAgents: { type: "array", items: { type: "string" } }
      },
      required: ["workflowId", "requestId", "participatingAgents"]
    }
  },
  assign_task_to_agent: {
    name: "assign_task_to_agent",
    description: "Assign a task to a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        agentId: { type: "string" },
        taskDescription: { type: "string" }
      },
      required: ["taskId", "agentId", "taskDescription"]
    }
  },
  get_agent_tasks: {
    name: "get_agent_tasks",
    description: "Get all tasks assigned to a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" }
      },
      required: ["agentId"]
    }
  },
  // Communication Tools
  send_agent_message: {
    name: "send_agent_message",
    description: "Send a message from one agent to another",
    inputSchema: {
      type: "object",
      properties: {
        fromAgent: { type: "string" },
        toAgent: { type: "string" },
        messageContent: { type: "string" }
      },
      required: ["fromAgent", "toAgent", "messageContent"]
    }
  },
  get_agent_messages: {
    name: "get_agent_messages",
    description: "Get all messages for a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" }
      },
      required: ["agentId"]
    }
  },
  // Resource Management Tools
  lock_resource: {
    name: "lock_resource",
    description: "Lock a resource for exclusive or shared access",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: { type: "string" },
        agentId: { type: "string" },
        lockType: {
          type: "string",
          enum: ["exclusive", "shared"],
          default: "exclusive"
        }
      },
      required: ["resourceId", "agentId"]
    }
  },
  unlock_resource: {
    name: "unlock_resource",
    description: "Unlock a resource",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: { type: "string" },
        agentId: { type: "string" }
      },
      required: ["resourceId", "agentId"]
    }
  },
  check_resource_status: {
    name: "check_resource_status",
    description: "Check the lock status of a resource",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: { type: "string" }
      },
      required: ["resourceId"]
    }
  },
  // Enhanced Query Tools
  search_by_agent: {
    name: "search_by_agent",
    description:
      "Search for entities and relations created or modified by a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" }
      },
      required: ["agentId"]
    }
  },
  search_by_workflow: {
    name: "search_by_workflow",
    description:
      "Search for entities and relations related to a specific workflow",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" }
      },
      required: ["workflowId"]
    }
  },
  // Enhanced Communication Tools
  discover_agents: {
    name: "discover_agents",
    description: "Discover agents based on capabilities and/or agent type",
    inputSchema: {
      type: "object",
      properties: {
        capabilities: { type: "array", items: { type: "string" } },
        agentType: { type: "string" }
      }
    }
  },
  broadcast_message: {
    name: "broadcast_message",
    description: "Send a broadcast message to multiple agents",
    inputSchema: {
      type: "object",
      properties: {
        fromAgent: { type: "string" },
        messageContent: { type: "string" },
        targetAgentTypes: { type: "array", items: { type: "string" } }
      },
      required: ["fromAgent", "messageContent"]
    }
  },
  subscribe_to_events: {
    name: "subscribe_to_events",
    description: "Subscribe an agent to specific event types",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        eventTypes: { type: "array", items: { type: "string" } }
      },
      required: ["agentId", "eventTypes"]
    }
  },
  publish_event: {
    name: "publish_event",
    description: "Publish an event to subscribed agents",
    inputSchema: {
      type: "object",
      properties: {
        publisherAgent: { type: "string" },
        eventType: { type: "string" },
        eventData: { type: "object" }
      },
      required: ["publisherAgent", "eventType", "eventData"]
    }
  },
  get_agent_events: {
    name: "get_agent_events",
    description:
      "Get events for a specific agent, optionally filtered by event types",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        eventTypes: { type: "array", items: { type: "string" } }
      },
      required: ["agentId"]
    }
  },
  create_communication_channel: {
    name: "create_communication_channel",
    description: "Create a communication channel for multiple agents",
    inputSchema: {
      type: "object",
      properties: {
        channelId: { type: "string" },
        creatorAgent: { type: "string" },
        participants: { type: "array", items: { type: "string" } },
        channelType: {
          type: "string",
          enum: ["direct", "group", "broadcast"],
          default: "group"
        }
      },
      required: ["channelId", "creatorAgent", "participants"]
    }
  },
  send_channel_message: {
    name: "send_channel_message",
    description: "Send a message to a communication channel",
    inputSchema: {
      type: "object",
      properties: {
        channelId: { type: "string" },
        fromAgent: { type: "string" },
        messageContent: { type: "string" }
      },
      required: ["channelId", "fromAgent", "messageContent"]
    }
  },
  get_channel_messages: {
    name: "get_channel_messages",
    description: "Get messages from a communication channel",
    inputSchema: {
      type: "object",
      properties: {
        channelId: { type: "string" },
        limit: { type: "number" }
      },
      required: ["channelId"]
    }
  },
  // Agent Collaboration Utilities
  delegate_task: {
    name: "delegate_task",
    description: "Delegate a task from one agent to another",
    inputSchema: {
      type: "object",
      properties: {
        fromAgent: { type: "string" },
        toAgent: { type: "string" },
        taskId: { type: "string" },
        taskDescription: { type: "string" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          default: "medium"
        },
        deadline: { type: "string" }
      },
      required: ["fromAgent", "toAgent", "taskId", "taskDescription"]
    }
  },
  accept_delegation: {
    name: "accept_delegation",
    description: "Accept a delegated task",
    inputSchema: {
      type: "object",
      properties: {
        delegationId: { type: "string" },
        agentId: { type: "string" }
      },
      required: ["delegationId", "agentId"]
    }
  },
  reject_delegation: {
    name: "reject_delegation",
    description: "Reject a delegated task",
    inputSchema: {
      type: "object",
      properties: {
        delegationId: { type: "string" },
        agentId: { type: "string" },
        reason: { type: "string" }
      },
      required: ["delegationId", "agentId"]
    }
  },
  get_agent_delegations: {
    name: "get_agent_delegations",
    description: "Get all delegations for a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        status: {
          type: "string",
          enum: ["pending", "accepted", "rejected", "completed"]
        }
      },
      required: ["agentId"]
    }
  },
  share_resource: {
    name: "share_resource",
    description: "Share a resource with other agents",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: { type: "string" },
        ownerAgent: { type: "string" },
        sharedWithAgents: { type: "array", items: { type: "string" } },
        permissions: {
          type: "array",
          items: { type: "string", enum: ["read", "write", "execute"] }
        },
        expiresAt: { type: "string" }
      },
      required: ["resourceId", "ownerAgent", "sharedWithAgents", "permissions"]
    }
  },
  revoke_resource_share: {
    name: "revoke_resource_share",
    description: "Revoke resource sharing permissions",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: { type: "string" },
        ownerAgent: { type: "string" },
        revokeFromAgents: { type: "array", items: { type: "string" } }
      },
      required: ["resourceId", "ownerAgent", "revokeFromAgents"]
    }
  },
  get_shared_resources: {
    name: "get_shared_resources",
    description: "Get all resources shared with a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" }
      },
      required: ["agentId"]
    }
  },
  get_resource_shares: {
    name: "get_resource_shares",
    description: "Get all sharing information for a specific resource",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: { type: "string" }
      },
      required: ["resourceId"]
    }
  },
  create_collaborative_workflow: {
    name: "create_collaborative_workflow",
    description: "Create a collaborative workflow with multiple agents",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        creatorAgent: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        participants: { type: "array", items: { type: "string" } },
        workflowType: { type: "string" },
        deadline: { type: "string" }
      },
      required: [
        "workflowId",
        "creatorAgent",
        "title",
        "description",
        "participants"
      ]
    }
  },
  join_workflow: {
    name: "join_workflow",
    description: "Join an existing collaborative workflow",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        agentId: { type: "string" },
        role: { type: "string" }
      },
      required: ["workflowId", "agentId"]
    }
  },
  leave_workflow: {
    name: "leave_workflow",
    description: "Leave a collaborative workflow",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        agentId: { type: "string" },
        reason: { type: "string" }
      },
      required: ["workflowId", "agentId"]
    }
  },
  update_workflow_status: {
    name: "update_workflow_status",
    description: "Update the status of a collaborative workflow",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        agentId: { type: "string" },
        status: {
          type: "string",
          enum: ["planning", "active", "paused", "completed", "cancelled"]
        },
        statusMessage: { type: "string" }
      },
      required: ["workflowId", "agentId", "status"]
    }
  },
  get_workflow_participants: {
    name: "get_workflow_participants",
    description: "Get all participants in a collaborative workflow",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" }
      },
      required: ["workflowId"]
    }
  },
  get_agent_workflows: {
    name: "get_agent_workflows",
    description: "Get all workflows an agent is participating in",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        status: {
          type: "string",
          enum: ["planning", "active", "paused", "completed", "cancelled"]
        }
      },
      required: ["agentId"]
    }
  }
};

// Remove all unused const wrapper functions and interfaces below this point
// End of file
