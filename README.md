# 🌌 WeMake AI: Enterprise MCP Server Ecosystem

> **AI-First Enterprise Solutions for the German Market**

WeMake AI delivers production-ready [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers designed
for enterprise environments, with a focus on GDPR compliance, German healthcare standards, and zero-downtime deployment
on Cloudflare Workers.

Our MCP servers enable Large Language Models to securely access enterprise data sources, business tools, and AI agents
while maintaining the highest standards of security, privacy, and regulatory compliance.

## 🏢 Enterprise Features

- **🛡️ GDPR Compliant**: Built-in data protection and privacy controls
- **🇩🇪 German Market Focus**: Optimized for German enterprise and healthcare requirements
- **⚡ Bun-First Development**: High-performance TypeScript with Bun runtime
- **☁️ Cloudflare Workers**: Edge deployment with global scalability
- **🌌 AI Agent Ready**: Autonomous systems with self-healing capabilities
- **📊 Enterprise Monitoring**: Comprehensive observability and audit trails
- **🔒 Security by Design**: Zero-trust architecture with enterprise-grade security

[![License: BSL-1.1](https://img.shields.io/badge/License-BSL%201.1-blue)](LICENSE)
[![Bun](https://img.shields.io/badge/Runtime-Bun-orange)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)](https://typescriptlang.org)
[![Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-green)](https://gdpr.eu)

## 🌟 Enterprise MCP Servers

Our production-ready MCP servers are designed for enterprise environments with focus on security, compliance, and
scalability.

### 🏥 Healthcare & GDPR Compliance

- **`@wemake-ai/mcp-gdpr-server`** - GDPR-compliant data processing with audit trails
- **`@wemake-ai/mcp-healthcare-server`** - German healthcare standards (DiGA, ePA, TI)
- **`@wemake-ai/mcp-audit-server`** - Enterprise audit logging and compliance reporting

### 🌌 AI Agent Automation

- **`@wemake-ai/mcp-agent-server`** - Autonomous AI agent orchestration
- **`@wemake-ai/mcp-monitoring-server`** - Self-healing systems with predictive analytics
- **`@wemake-ai/mcp-workflow-server`** - Enterprise workflow automation

### 🔧 Developer Experience

- **`@wemake-ai/mcp-devtools-server`** - Bun-optimized development tools
- **`@wemake-ai/mcp-testing-server`** - Enterprise testing and quality assurance
- **`@wemake-ai/mcp-deployment-server`** - Zero-downtime Cloudflare Workers deployment

### 🏢 Enterprise Integration

- **`@wemake-ai/mcp-crm-server`** - Enterprise CRM integration (SAP, Salesforce)
- **`@wemake-ai/mcp-erp-server`** - German ERP systems integration
- **`@wemake-ai/mcp-security-server`** - Enterprise security and identity management

## 🚀 Getting Started

### Prerequisites

- **Bun Runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Node.js 18+**: For compatibility with existing toolchains
- **TypeScript 5.0+**: Enterprise-grade type safety
- **Cloudflare Account**: For edge deployment

### Quick Start

```sh
# Clone the repository
git clone https://github.com/wemake-ai/mcp.git
cd mcp

# Install dependencies with Bun
bun install

# Run enterprise tests
bun run test

# Start development server
bun run dev
```

_Note: Bun loads `.env` automatically, so no separate `dotenv` setup is required._

### Enterprise Installation

```sh
# Install specific MCP server
bun add @wemake-ai/mcp-gdpr-server

# Or install the complete enterprise suite
bun add @wemake-ai/mcp-enterprise-suite
```

### Configuration

Create a `.env` file with your enterprise configuration:

```env
# GDPR Compliance
GDPR_ENABLED=true

# 7 years for German compliance
DATA_RETENTION_DAYS=2555
AUDIT_LOG_LEVEL=enterprise

# Cloudflare Workers
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Enterprise Monitoring
MONITORING_ENDPOINT=https://monitoring.wemake.cx
ALERT_WEBHOOK=https://alerts.your-company.de
```

### Using MCP Servers

#### With Claude Desktop

```json
{
  "mcpServers": {
    "wemake-gdpr": {
      "command": "bunx",
      "args": ["@wemake-ai/mcp-gdpr-server"],
      "env": {
        "GDPR_ENABLED": "true"
      }
    }
  }
}
```

#### With Enterprise AI Platforms

```typescript
import { MCPClient } from "@wemake-ai/mcp-client";

const client = new MCPClient({
  serverUrl: "https://mcp.wemake.cx",
  apiKey: process.env.WEMAKE_API_KEY,
  gdprCompliant: true,
  auditLogging: true
});

// Connect to enterprise MCP server
await client.connect();
```

## 🚀 Enterprise Deployment

### Cloudflare Workers Deployment

```sh
# Deploy to Cloudflare Workers
bun run deploy:production

# Deploy with enterprise monitoring
bun run deploy:enterprise
```

### Docker Enterprise

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wemake-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wemake-mcp
  template:
    metadata:
      labels:
        app: wemake-mcp
    spec:
      containers:
        - name: mcp-server
          image: wemake/mcp-server:latest
          env:
            - name: GDPR_ENABLED
              value: "true"
```

## 📊 Enterprise Monitoring

- **Real-time Metrics**: Performance, usage, and compliance metrics
- **Audit Trails**: Complete GDPR-compliant audit logging
- **Health Checks**: Automated monitoring with self-healing
- **Alerting**: Enterprise-grade alerting and incident management
- **Analytics**: AI-powered insights and predictive analytics

## 🤝 Enterprise Support

### Professional Services

- **Implementation Consulting**: Expert guidance for enterprise deployment
- **Custom Development**: Tailored MCP servers for specific requirements
- **Training & Workshops**: Team training on MCP and AI agent development
- **24/7 Support**: Enterprise-grade support with SLA guarantees

### Contact

- **Website**: [wemake.cx](https://wemake.cx)
- **Enterprise Sales**: [enterprise@wemake.cx](mailto:enterprise@wemake.cx)
- **Technical Support**: [support@wemake.cx](mailto:support@wemake.cx)
- **Security Issues**: [security@wemake.cx](mailto:security@wemake.cx)

See also: [Security Policy](docs/SECURITY.md) • [Code of Conduct](docs/CODE_OF_CONDUCT.md)

### Community

- **GitHub Discussions**: [Community Forum](https://github.com/wemake-ai/mcp/discussions)
- **Discord**: [WeMake AI Community](https://discord.gg/wemake-ai)
- **LinkedIn**: [WeMake AI](https://linkedin.com/company/wemake-ai)

## 📜 License

This project is licensed under the Business Source License 1.1 (BSL-1.1). See the [LICENSE](LICENSE) file for details.

### Enterprise Licensing

- **Open Source**: BSL-1.1 for development and non-commercial use
- **Enterprise License**: Commercial license available for production deployments
- **Custom Licensing**: Tailored licensing for specific enterprise requirements

For enterprise licensing inquiries, contact: <licensing@wemake.cx>

---

<div align="center">
  <strong>Built with 💙 by WeMake AI for the German Enterprise Market</strong><br>
  <em>Empowering AI-First Organizations with Secure, Compliant, and Scalable Solutions</em>
</div>
