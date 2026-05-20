import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolResult, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import chalk from "chalk";
import { TransactionManager } from "../codemode/index.js";
import { TxnRequestSchema, TxnRequestArgs, TxnResponse } from "../core/types.js";

// Instantiate the manager
const transactionManager = new TransactionManager();

export async function handleTransactionCallback(args: TxnRequestArgs): Promise<CallToolResult> {
  const { action, token: requestToken, payload, ttlSeconds: requestTtl } = args;

  try {
    let responsePayload: TxnResponse;

    switch (action) {
      case "start": {
        if (requestToken) {
          throw new McpError(ErrorCode.InvalidParams, 'Token should not be provided for the "start" action.');
        }
        responsePayload = await transactionManager.start(payload, requestTtl);
        break;
      }
      case "resume": {
        if (!requestToken) {
          throw new McpError(ErrorCode.InvalidParams, 'Token is required for the "resume" action.');
        }
        responsePayload = await transactionManager.resume(requestToken, payload, requestTtl);
        break;
      }
      case "close": {
        if (!requestToken) {
          throw new McpError(ErrorCode.InvalidParams, 'Token is required for the "close" action.');
        }
        responsePayload = await transactionManager.close(requestToken);
        break;
      }
      // No default needed as zod schema handles invalid actions
    }

    // Return successful result
    return {
      content: [{ type: "text", text: JSON.stringify(responsePayload!) }]
    };
  } catch (error: unknown) {
    console.error(chalk.red("Error handling transaction:"), error);
    // Return error result
    const errorPayload: TxnResponse = {
      status: "error",
      token: requestToken ?? "unknown",
      error:
        error instanceof McpError
          ? error.message
          : error instanceof Error
            ? error.message
            : "An unexpected server error occurred.",
      expiresAt: null
    };
    const errorMessage = errorPayload.error;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(errorPayload)
        },
        {
          type: "text", // Also include plain text error
          text: errorMessage ?? "Unknown error" // Ensure text is always string
        }
      ],
      isError: true
    };
  }
}

/**
 * Factory function that creates and configures a transaction manager MCP server instance.
 */
export function createServer(): McpServer {
  const mcpServer = new McpServer({
    name: "transaction-manager",
    version: "0.4.6"
  });

  // Register the single tool
  mcpServer.tool(
    "transaction",
    "Manages simple stateful transactions (start, resume, close)",
    TxnRequestSchema.shape, // Pass the shape for Zod validation
    handleTransactionCallback
  );

  return mcpServer;
}

export async function runServer(): Promise<void> {
  const mcpServer = createServer();

  // Connect using stdio
  const transport = new StdioServerTransport();
  try {
    await mcpServer.connect(transport);
    console.error(chalk.green("Transaction Manager MCP Server running on stdio.")); // Use console.error for logs
  } catch (error) {
    console.error(chalk.red("Failed to connect Transaction Manager server:"), error);
    process.exit(1);
  }
}
