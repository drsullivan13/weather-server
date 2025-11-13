import express, { type Request, type Response } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { atxpExpress, requirePayment, ATXPAccount } from '@atxp/express'; 
import BigNumber from "bignumber.js"; 

// Create our McpServer instance with the appropriate name and version
const server = new McpServer({
  name: "atxp-weather-server",
  version: "1.0.0",
});

// todo will create weather tools here
server.registerTool(
  "add",
  {
    title: "Addition Tool",
    description: "Add two numbers together",
    inputSchema: {
      a: z.number(),
      b: z.number()
    },
    outputSchema: {
      result: z.number()
    }
  },
  async ({ a, b }) => {
    // Require payment (in USDC) for the tool call
    await requirePayment({price: BigNumber(0.01)}); 
    const output = { result: a + b };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(output),
        },
      ],
      structuredContent: output
    };
  }
); 

// Create our Express application
const app = express();

// Configure our Express application to parse JSON bodies
app.use(express.json());

const ATXP_CONNECTION = process.env.ATXP_CONNECTION

// Configure our Express application to use the ATXP router 
if (!ATXP_CONNECTION) {
  throw new Error("ATXP_CONNECTION environment variable is not defined.");
}
app.use(atxpExpress({ 
  destination: new ATXPAccount(ATXP_CONNECTION), 
  payeeName: 'Add', 
}));

// Setup the URL endpoint that will handle MCP requests
app.post('/', async (req: Request, res: Response) => {
  console.log('Received MCP request:', req.body);

  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  // Clean up transport when response closes
  res.on('close', () => {
    transport.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
}).on('error', error => {
  console.error('Server error:', error);
  process.exit(1);
});