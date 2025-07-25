# Summon MCP Server

**Summon** is a Model Context Protocol (MCP) server that enables AI agents to
consult large context window models for analyzing extensive file collections -
entire codebases, document repositories, or mixed content that exceed the
current agent's context limits. Supports _OpenAI_ and _Google_ as providers.

## Why Summon?

When working with AI agents that have limited context windows (like Claude with
200K tokens), **Summon** allows them to leverage models with massive context
windows to analyze large codebases or document collections that would otherwise
be impossible to process in a single query.

> "For Trae IDE users, Summon is a game changer."

## How it works

**Summon** recursively collects all files from a given path that match your
regex pattern (including all subdirectories), assembles them into a single
context, and sends them to a large context window model along with your query.
The result of this query is directly fed back to the agent you are working with.

## Example Use Cases

### Summarize an entire codebase

- **Query:** "Summarize the architecture and main components of this Python
  project"
- **Pattern:** `".*\.py$"` (all Python files)
- **Path:** `/Users/john/my-python-project`

### Find specific method definitions

- **Query:** "Find the implementation of the authenticate_user method and
  explain how it handles password verification"
- **Pattern:** `".*\.(py|js|ts)$"` (Python, JavaScript, TypeScript files)
- **Path:** `/Users/john/backend`

### Analyze test coverage

- **Query:** "List all the test files and identify which components lack test
  coverage"
- **Pattern:** `".*test.*\.py$|.*_test\.py$"` (test files)
- **Path:** `/Users/john/project`

### Complex analysis with thinking mode

- **Query:** "Analyze the authentication flow across this codebase. Think step
  by step about security vulnerabilities and suggest improvements"
- **Pattern:** `".*\.(py|js|ts)$"`
- **Model:** `"gemini-2.5-flash|thinking"`
- **Path:** `/Users/john/webapp`

## Installation

### Trae IDE

Add this MCP via "Add Manually":

```json
{
  "mcpServers": {
    "summon": {
      "type": "stdio",
      "command": "uvx",
      "args": ["summon", "gemini", "your-api-key"]
    }
  }
}
```

Replace `gemini` with your provider choice (e.g. `openai`) and `your-api-key`
with your actual API key.

No installation required - `uvx` automatically downloads and runs summon in an
isolated environment.

## Command Line Options

```sh
uvx summon <provider> <api-key> [--test]
```

- `<provider>`: Required. Choose from `google` or `openai`
- `<api-key>`: Required. Your API key for the chosen provider
- `--test`: Optional. Test the API connection

The model is specified when calling the tool, not at startup. The server shows
example models for your provider on startup.

### Model Examples

#### Google

Standard models:

- `"gemini-2.5-flash"` - Fast model
- `"gemini-2.5-flash-lite-preview-06-17"` - Ultra fast lite model
- `"gemini-2.5-pro"` - Intelligent model
- `"gemini-2.0-flash-exp"` - Experimental model

With thinking mode (add `|thinking` suffix):

- `"gemini-2.5-flash|thinking"` - Fast with deep reasoning
- `"gemini-2.5-flash-lite-preview-06-17|thinking"` - Ultra fast with deep
  reasoning
- `"gemini-2.5-pro|thinking"` - Intelligent with deep reasoning

#### OpenAI

Standard models (include context length):

- `"gpt-4.1-2025-04-14|1047576"` - 1M+ context, very fast
- `"gpt-4.1-nano-2025-04-14|1047576"` - 1M+ context, ultra fast
- `"o3-2025-04-16|200k"` - Advanced reasoning model
- `"o4-mini-2025-04-16|200k"` - Fast reasoning model

O-series models with |thinking marker:

- `"o1-mini|128k|thinking"` - Mini reasoning with |thinking marker
- `"o3-2025-04-16|200k|thinking"` - Advanced reasoning with |thinking marker

**Note:** For OpenAI, |thinking is only supported on o-series models and serves
as an informational marker. The models use reasoning tokens automatically.

**Advanced:** You can specify custom thinking tokens with `|thinking=30000` but
this is rarely needed.

## Testing

```sh
# Test Google AI
uvx summon google AIza... --test

# Test OpenAI
uvx summon openai sk-proj-... --test
```
