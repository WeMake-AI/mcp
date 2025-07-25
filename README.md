# 💙 WeMake AI Model Context Protocol servers

This repository is a collection of _reference implementations_ for the
[Model Context Protocol](https://modelcontextprotocol.io/) (MCP), as well as
references to community built servers and additional resources.

The servers in this repository showcase the versatility and extensibility of
MCP, demonstrating how it can be used to give Large Language Models (LLMs)
secure, controlled access to tools and data sources. Typically, each MCP server
is implemented with an MCP SDK:

- [Typescript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Python MCP SDK](https://github.com/modelcontextprotocol/python-sdk)

> Note: Lists in this README are maintained in alphabetical order to minimize
> merge conflicts when adding new items.

## 🌟 Servers

These servers aim to demonstrate MCP features and the official SDKs.

- **[Deep Thinking](src/deep-thinking)** - Dynamic and reflective
  problem-solving through thought sequences

## 🚀 Getting Started

### Using MCP Servers in this Repository

Typescript-based servers in this repository can be used directly with `bunx`.

For example, this will start the [Deep Thinking](src/deep-thinking) server:

```sh
bunx -y @wemake-ai/mcpserver-deep-thinking@latest
```

Python-based servers in this repository can be used directly with
[`uvx`](https://docs.astral.sh/uv/concepts/tools/) or
[`pip`](https://pypi.org/project/pip/). `uvx` is recommended for ease of use and
setup.

For example, this will start the [Git](src/git) server:

```sh
# With uvx
uvx mcp-server-git

# With pip
pip install mcp-server-git
python -m mcp_server_git
```

Follow [these](https://docs.astral.sh/uv/getting-started/installation/)
instructions to install `uv` / `uvx` and
[these](https://pip.pypa.io/en/stable/installation/) to install `pip`.

### Using an MCP Client

However, running a server on its own isn't very useful, and should instead be
configured into an MCP client. For example, here's the Claude Desktop
configuration to use the above server:

```json
{
  "mcpServers": {
    "memory": {
      "command": "bunx",
      "args": ["-y", "@wemake-ai/mcp-memory"]
    }
  }
}
```

Additional examples of using the Claude Desktop as an MCP client might look
like:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "bunx",
      "args": ["-y", "@wemake-ai/mcp-filesystem", "/path/to/allowed/files"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "path/to/git/repo"]
    },
    "github": {
      "command": "bunx",
      "args": ["-y", "@wemake-ai/mcp-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    },
    "postgres": {
      "command": "bunx",
      "args": ["-y", "@wemake-ai/mcp-postgres", "postgresql://localhost/mydb"]
    }
  }
}
```

## 🛠️ Creating Your Own Server

Interested in creating your own MCP server? Visit the official documentation at
[modelcontextprotocol.io](https://modelcontextprotocol.io/introduction) for
comprehensive guides, best practices, and technical details on implementing MCP
servers.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## ⭐ Support

If you find MCP servers useful, please consider starring the repository and
contributing new servers or improvements!

---

Managed by WeMake, but built together with the community. The Model Context
Protocol is open source and we encourage everyone to contribute their own
servers and improvements!
