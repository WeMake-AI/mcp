# Project Rules

## Core Guidelines

- **Bun-First Development**: EXCLUSIVELY use Bun for all operations: `bun install`, `bun run`, `bun test`, `bun build`,
  and `Bun.serve()` for servers. PROHIBITED: Node.js, npm, yarn, pnpm, express, vite, webpack, esbuild, or any non-Bun
  alternatives unless technically impossible.

- **Bun Built-in APIs**: MANDATORY use of Bun's native APIs: `Bun.serve()` for HTTP/WebSocket servers, `bun:sqlite` for
  SQLite, `Bun.redis` for Redis, `Bun.sql` for PostgreSQL, `Bun.file` for file operations, `Bun.$` for shell commands,
  and `Bun.password` for secure hashing. PROHIBITED: External libraries like better-sqlite3, ioredis, pg, ws, execa, or
  dotenv.

- **Enterprise Monorepo Architecture**: Leverage Bun workspaces for `src/*` packages. Implement automated builds, tests,
  and deployment via root package.json. ENSURE operational simplicity, enterprise scalability, and GDPR compliance by
  design.

- **AI-First Development Principles**: Prioritize code understanding and review quality over generation speed. The real
  bottlenecks are code reviews, knowledge transfer, testing, and coordination - not writing code. Design for
  comprehensive code understanding with detailed JSDoc comments explaining purpose, business context, and decision
  rationale. Implement automated testing and self-healing systems while ensuring human reviewers can easily understand
  AI-generated code.

- **Enterprise Testing Standards**: Use Vitest with `bun test` execution. Configure vitest.config.ts for monorepo test
  projects. MANDATORY 90%+ coverage for lines, functions, branches, and statements. Place tests in `tests/` folders
  using `functionName.test.ts` naming. Integrate with GitHub Actions for CI/CD with coverage enforcement and automated
  deployment to Cloudflare Workers.

- **Modern Frontend Architecture**: Use HTML imports with `Bun.serve()` for SSR/SPA hybrid approach. Import
  .tsx/.jsx/.js and .css files directly in HTML with Bun's native bundling. Support React, TypeScript, and Tailwind CSS.
  Enable HMR and comprehensive error logging in development.

- **MCP Server Excellence**: Implement Model Context Protocol servers following enterprise security patterns: tool
  discovery, schema validation, transactional integrity, least-privilege access, Human-in-the-Loop (HITL) for sensitive
  operations, comprehensive audit logging, and GDPR-compliant data handling.

### Zero-Shot CoT

**AI-First Reasoning Process:** For all development tasks, code generation, configuration, and troubleshooting:

1. **Enterprise Requirements Analysis:** Identify core requirements and map to WeMake's enterprise standards: Bun-first
   architecture, GDPR compliance, MCP protocol adherence, and Cloudflare Workers deployment compatibility. Prioritize
   code understanding and maintainability over generation speed. Resolve ambiguities using the most secure, scalable,
   and comprehensible approach that facilitates effective code reviews and knowledge transfer.

2. **Strategic Solution Planning:** Decompose tasks into atomic, testable components aligned with Bun ecosystem,
   TypeScript strict mode, and enterprise security patterns. Define clear interfaces, error boundaries, and monitoring
   points for self-healing systems.

3. **Implementation with Excellence:** Generate production-ready code optimized for understanding and review quality.
   Include comprehensive JSDoc documentation explaining not just what code does, but why specific solutions were chosen.
   Use strict TypeScript typing, enterprise security patterns, and GDPR compliance. Prioritize code clarity and
   maintainability to reduce review burden and facilitate knowledge transfer.

4. **Quality Assurance & Compliance:** Validate against enterprise standards: 90%+ test coverage, security best
   practices, performance benchmarks, accessibility requirements, and regulatory compliance. Implement automated quality
   gates and monitoring.

5. **Deployment-Ready Delivery:** Provide complete, self-contained solutions with deployment configurations, monitoring
   setup, documentation, and maintenance procedures. Include rollback strategies and incident response procedures.

### Enterprise Output Standards

- **Production-Ready Code:** TypeScript with strict mode, comprehensive JSDoc with business context, enterprise security
  patterns, GDPR compliance annotations, performance optimizations, and self-healing error recovery mechanisms.

- **Enterprise Architecture:** Complete monorepo structure with clear domain boundaries, dependency injection patterns,
  configuration management, secrets handling, audit logging, and compliance documentation.

- **Comprehensive Testing:** Vitest test suites with 90%+ coverage, integration tests, security tests, performance
  benchmarks, accessibility tests, and compliance validation. Include test data management and mock strategies.

- **Enterprise Documentation:** Technical specifications, API documentation, security assessments, compliance reports,
  deployment guides, incident response procedures, and business continuity plans.

- **Cloud-Native Deployment:** Cloudflare Workers configurations, infrastructure as code, monitoring and alerting setup,
  automated scaling policies, disaster recovery procedures, and compliance audit trails.

- **AI Agent Integration:** Self-documenting code with clear interfaces for AI agents, automated quality gates,
  continuous improvement feedback loops, and minimal human intervention requirements.

- **Response Format:** ALWAYS use markdown with code blocks for files/scripts. Include full file contents with
  TypeScript types, comprehensive comments, and tests. Be thorough yet concise, professional and directive. Limit to
  rule-compliant solutions; explain violations and suggest alternatives.
