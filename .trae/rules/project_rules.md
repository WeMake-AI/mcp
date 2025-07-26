# Project Rules

## Monorepo Best Practices

- Use Bun's workspace features for managing multiple packages in `src/*`.
- Automate builds and tests across workspaces with `bun run` scripts in the root
  package.json.
- Simplify operations by leveraging Bun's built-in tools for dependency
  management and scripting.

## TypeScript

- Use TypeScript for all code.
- Follow the project's tsconfig.json settings.
- Enable strict type checking.

## Development Principles

- Prioritize velocity: Focus on rapid iteration while maintaining code quality
  through automated tests and linting.
- Add function-level comments when generating code, explaining purpose and key
  logic.
- Optimize for a single full-stack developer: Emphasize simple, maintainable
  architectures and minimal dependencies.

## Additional Guidelines

- Focus on automation: Use scripts for common tasks like building, testing, and
  publishing.
- Ensure operational simplicity: Avoid complex setups; prefer Bun's native
  capabilities.
- For MCP servers: Follow Model Context Protocol best practices as per
  documentation.

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` for simple scripts; use Vitest for comprehensive monorepo
  testing with coverage requirements
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or
  `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

### APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Testing

Use `bun test` to run tests.

```ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

### Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully
support React, CSS, Tailwind.

Server:

```ts
import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      }
    }
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true
  }
});
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will
transpile & bundle automatically. `<link>` tags can point to stylesheets and
Bun's CSS bundler will bundle.

```html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx
import React from "react";

// import .css files directly and it works
import "./index.css";

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in
`node_modules/bun-types/docs/**.md`.

## Testing Strategy

Use Vitest as the primary testing framework for this MCP monorepo with
automated, reliable, scalable, and streamlined testing.

### Configuration

- Use `vitest.config.ts` in root with Test Projects for monorepo support
- Configure coverage thresholds: 80% for lines, functions, branches, statements
- Enable TypeScript support with `vite-tsconfig-paths` plugin
- Use project-specific configurations for each package under `src/*`

### Directory Structure

- Root: `vitest.config.ts`, test scripts in `package.json`
- Packages: Add `tests/` folders in each `src/*` package with `*.test.ts` files
- Naming convention: `functionName.test.ts`

### Scripts

Add to root `package.json`:

```json
"scripts": {
  "test": "bun run vitest",
  "test:watch": "bun run vitest --watch",
  "test:coverage": "bun run vitest --coverage"
}
```

### CI Integration

- Run tests on push/pull requests via GitHub Actions
- Use `bun test --coverage` in CI pipeline
- Ensure coverage thresholds are met for quality gates

### Best Practices

- **Test Types**: Unit tests for functions, integration tests for MCP
  servers/tools
- **Mocking**: Use `vi.mock` for dependencies
- **Coverage**: Monitor and maintain 80% threshold across all metrics
- **Watch Mode**: Use for development feedback
- **Parallelism**: Leverage Vitest's automatic parallel execution
- **TypeScript**: Enable live type resolution with custom export conditions

### Example Test

```ts
import { expect, test } from "vitest";
import { someFunction } from "../index";

test("someFunction works", () => {
  expect(someFunction()).toBe(true);
});
```

### Monorepo TypeScript Resolution

Add to each package's `package.json`:

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "default": "./dist/index.js",
    "bun": "./src/index.ts"
  }
}
```

This strategy ensures efficient testing that scales with the monorepo while
maintaining quality through automation and coverage requirements.
