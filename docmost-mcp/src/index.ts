import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { login } from './auth.js';
import {
  listSpaces,
  listSpacesSchema,
  listSpacesDescription,
} from './tools/list-spaces.js';
import {
  searchDocs,
  searchDocsSchema,
  searchDocsDescription,
} from './tools/search-docs.js';
import {
  getPage,
  getPageSchema,
  getPageDescription,
} from './tools/get-page.js';
import {
  listPages,
  listPagesSchema,
  listPagesDescription,
} from './tools/list-pages.js';
import {
  createPage,
  createPageSchema,
  createPageDescription,
} from './tools/create-page.js';
import {
  updatePage,
  updatePageSchema,
  updatePageDescription,
} from './tools/update-page.js';

const WRITE_MODE = process.env.DOCMOST_ALLOW_WRITE === 'true';

// ─── Env validation ───────────────────────────────────────────────────────────

function assertEnv() {
  const missing = ['DOCMOST_URL', 'DOCMOST_EMAIL', 'DOCMOST_PASSWORD'].filter(
    (k) => !process.env[k],
  );
  if (missing.length > 0) {
    console.error(`[docmost-mcp] Variables d'environnement manquantes : ${missing.join(', ')}`);
    console.error('[docmost-mcp] Créez un fichier .env à partir de .env.example');
    process.exit(1);
  }

}

// ─── Startup check ────────────────────────────────────────────────────────────

async function startupCheck() {
  const url = process.env.DOCMOST_URL!;
  process.stderr.write(`[docmost-mcp] Vérification connectivité → ${url}\n`);

  // 1. Connectivité réseau (HEAD sur la racine)
  try {
    const probe = await fetch(url, { method: 'HEAD' });
    process.stderr.write(`[docmost-mcp] Instance joignable (HTTP ${probe.status}).\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[docmost-mcp] Instance injoignable (${url}) : ${msg}\n`);
    process.exit(1);
  }

  // 2. Authentification lecture
  try {
    await login();
    process.stderr.write('[docmost-mcp] Authentifié (lecture) avec succès.\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[docmost-mcp] Échec d'authentification lecture : ${msg}\n`);
    process.exit(1);
  }

}

// ─── Tool registry ────────────────────────────────────────────────────────────

const READ_TOOLS = [
  { name: 'list_spaces', description: listSpacesDescription, inputSchema: listSpacesSchema, handler: listSpaces },
  { name: 'search_docs', description: searchDocsDescription, inputSchema: searchDocsSchema, handler: searchDocs },
  { name: 'get_page',    description: getPageDescription,    inputSchema: getPageSchema,    handler: getPage },
  { name: 'list_pages',  description: listPagesDescription,  inputSchema: listPagesSchema,  handler: listPages },
];

const WRITE_TOOLS = [
  { name: 'create_page', description: createPageDescription, inputSchema: createPageSchema, handler: createPage },
  { name: 'update_page', description: updatePageDescription, inputSchema: updatePageSchema, handler: updatePage },
];

const TOOLS = WRITE_MODE ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS;

function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape> | z.ZodEffects<z.ZodObject<z.ZodRawShape>>) {
  // Minimal inline conversion — only what we need for these schemas
  const shape = schema instanceof z.ZodEffects ? schema._def.schema.shape : schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const field = value as z.ZodTypeAny;
    const isOptional = field.isOptional?.() ?? false;
    const inner = field instanceof z.ZodOptional ? field._def.innerType : field;

    const prop: Record<string, unknown> = {};
    if (inner._def?.description) prop['description'] = inner._def.description;

    if (inner instanceof z.ZodString) prop['type'] = 'string';
    else if (inner instanceof z.ZodNumber) { prop['type'] = 'number'; }
    else if (inner instanceof z.ZodDefault) {
      const defaultInner = inner._def.innerType;
      if (defaultInner instanceof z.ZodNumber) { prop['type'] = 'number'; prop['default'] = inner._def.defaultValue(); }
      else if (defaultInner instanceof z.ZodString) { prop['type'] = 'string'; prop['default'] = inner._def.defaultValue(); }
      else prop['type'] = 'unknown';
    } else prop['type'] = 'object';

    properties[key] = prop;
    if (!isOptional) required.push(key);
  }

  return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  assertEnv();
  await startupCheck();

  const server = new Server(
    { name: 'docmost-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema as z.ZodObject<z.ZodRawShape>),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req): Promise<CallToolResult> => {
    const tool = TOOLS.find((t) => t.name === req.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Outil inconnu : ${req.params.name}` }],
        isError: true,
      };
    }

    try {
      const args = tool.inputSchema.parse(req.params.arguments ?? {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await (tool.handler as (a: any) => Promise<CallToolResult>)(args)) as CallToolResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Erreur [${tool.name}] : ${msg}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const toolNames = TOOLS.map((t) => t.name).join(', ');
  process.stderr.write(`[docmost-mcp] Serveur MCP démarré (stdio). Mode écriture : ${WRITE_MODE ? 'OUI' : 'NON'}.\n`);
  process.stderr.write(`[docmost-mcp] Outils enregistrés (${TOOLS.length}) : ${toolNames}\n`);
}

main();
