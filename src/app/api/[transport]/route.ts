import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools } from '@/lib/mcp-tools';

function authCheck(request: Request): Response | null {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) return new Response('MCP_API_KEY not configured', { status: 500 });
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${apiKey}`) return new Response('Unauthorized', { status: 401 });
  return null;
}

async function handleMcp(request: Request): Promise<Response> {
  const server = new McpServer({ name: 'cook-dfchen', version: '1.0.0' });
  registerTools(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — required for Vercel serverless
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  await server.close();
  return response;
}

export async function GET(request: Request) {
  const err = authCheck(request);
  if (err) return err;
  return handleMcp(request);
}

export async function POST(request: Request) {
  const err = authCheck(request);
  if (err) return err;
  return handleMcp(request);
}

export async function DELETE(request: Request) {
  const err = authCheck(request);
  if (err) return err;
  return handleMcp(request);
}
