# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server built with Bun that provides weather-related tools accessible via HTTP. The server uses the ATXP payment system to monetize tool calls, requiring micropayments in USDC for each operation.

## Runtime & Build System

**ALWAYS use Bun, never Node.js or npm.**

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`

**Bun automatically loads .env files** - never use or import the `dotenv` package.

### Available Scripts

- `bun run dev` - Run the server in development mode with hot reload
- `bun run build` - Build the server to `build/index.js` for production
- `bun run start` - Run the built production server
- `bun test` - Run tests

## Architecture

### MCP Server with Express + ATXP Payments

The server architecture combines three key components:

1. **MCP Server (`@modelcontextprotocol/sdk`)**: Handles tool registration and MCP protocol communication
2. **Express HTTP Server**: Provides the HTTP transport layer for MCP requests
3. **ATXP Payment Middleware (`@atxp/express`)**: Intercepts requests to require micropayments before tool execution

#### Request Flow

```
Client Request → Express (ATXP middleware) → MCP Transport → Tool Handler
                     ↓ (payment required)
                 ATXP Payment Flow
```

### Key Implementation Details

#### Stateless HTTP Pattern

The server creates a **new `StreamableHTTPServerTransport` for each request** to prevent JSON-RPC request ID collisions between different clients. This is the recommended pattern from the MCP SDK for stateless servers.

```typescript
app.post('/', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // stateless mode
    enableJsonResponse: true
  });

  res.on('close', () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

#### ATXP Payment Integration

Tools require payment using the `requirePayment` function from `@atxp/express`. The ATXP middleware is configured at the Express app level and intercepts requests before they reach tool handlers.

Configuration requires:
- `ATXP_CONNECTION` environment variable (connection URL with token)
- `destination` account (where payments are sent)
- `payeeName` (display name for the payment recipient)

### Tool Registration (MCP SDK)

Use `server.registerTool()` with the following structure:

```typescript
server.registerTool(
  "tool-name",
  {
    title: "Display Name",
    description: "What the tool does",
    inputSchema: {
      param1: z.string(),
      param2: z.number()
    },
    outputSchema: {
      result: z.string()
    }
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

**Important**: Use Zod v3 syntax (not v4) as the MCP SDK depends on `zod@^3.23.8`.

## TypeScript Configuration

The tsconfig uses strict bundler mode settings:

- `"verbatimModuleSyntax": true` - Requires explicit `type` imports for types (e.g., `import { type Request }`)
- `"moduleResolution": "bundler"` - Optimized for bundler environments like Bun
- `"noEmit": true` - TypeScript is only for type checking; Bun handles compilation
- `"module": "Preserve"` - Preserves module syntax for Bun to handle

When importing types from libraries, always use `type` keyword:
```typescript
import express, { type Request, type Response } from "express";
```

## Environment Variables

Required:
- `ATXP_CONNECTION` - ATXP payment system connection URL with token
- `PORT` - (optional) Server port, defaults to 3000

## Dependencies & Versions

Critical dependency versions to maintain compatibility:

- **Zod must be v3.x** (`^3.23.8`) - MCP SDK is incompatible with Zod v4
- `@modelcontextprotocol/sdk` - For MCP server functionality
- `@atxp/express` - Payment middleware integration
- `bignumber.js` - For precise monetary calculations (USDC amounts)

## Adding New Weather Tools

1. Register the tool using `server.registerTool()` before the Express app setup
2. Add `requirePayment()` call at the start of the tool handler
3. Define input/output schemas using Zod v3 syntax
4. Return both `content` (text) and `structuredContent` (typed object)

## Common Issues

- **Type errors on line imports**: Ensure you're using `import { type X }` for type-only imports
- **Zod schema errors**: Verify you're using Zod v3 (not v4) - check `package.json`
- **ATXP_CONNECTION missing**: Create `.env` file with the connection URL (Bun loads automatically)
- **Tool deprecation warnings**: Use `registerTool()`, not the deprecated `tool()` method
