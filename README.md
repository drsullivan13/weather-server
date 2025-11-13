# Weather MCP Server

Model Context Protocol server with integrated micropayment functionality. Built with Bun, TypeScript, and the ATXP payment system for monetizing LLM tool calls.

## Features

- **MCP Protocol**: Standardized tool interface for AI assistants
- **Payment Integration**: ATXP middleware requiring USDC micropayments per tool call
- **Stateless Architecture**: Per-request transport isolation for scalability
- **Type-Safe**: Strict TypeScript with Zod v3 validation
- **High Performance**: Bun runtime for fast execution

## Tech Stack

- Runtime: [Bun](https://bun.sh)
- Protocol: [MCP](https://modelcontextprotocol.io)
- Payment: ATXP
- Validation: Zod v3
- Server: Express v5

## Quick Start

```bash
# Install
bun install

# Configure .env
ATXP_CONNECTION="your-atxp-connection-url"
PORT=3000

# Development
bun run dev

# Production
bun run build
bun run start
```

## Architecture

```
Client → Express → ATXP Payment → MCP Transport → Tool Handler → Response
```

Each tool call validates payment before execution. The server creates a new `StreamableHTTPServerTransport` per request to prevent JSON-RPC ID collisions.

## Tool Registration

```typescript
server.registerTool(
  "tool-name",
  {
    title: "Tool Title",
    description: "What it does",
    inputSchema: { param: z.string() },
    outputSchema: { result: z.string() }
  },
  async (params) => {
    await requirePayment({ price: BigNumber(0.01) });
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output
    };
  }
);
```

## API

**POST /** - Accepts MCP JSON-RPC 2.0 requests

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": { "name": "tool-name", "arguments": {} },
  "id": 1
}
```

## TypeScript Config

- `verbatimModuleSyntax: true` - Explicit `type` imports required
- `moduleResolution: bundler` - Optimized for Bun
- `strict: true` - All strict checks enabled
- `noEmit: true` - Bun handles compilation

## Key Dependencies

- `@modelcontextprotocol/sdk` - MCP implementation
- `@atxp/express` - Payment middleware
- `zod@^3.23.8` - Required for MCP SDK compatibility
- `bignumber.js` - Precise monetary calculations

---

Built with [Bun](https://bun.sh) 🥟
