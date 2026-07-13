import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PORT = Number(process.env.AI_SERVER_PORT || 8787);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(root, '.env.local'));
loadEnvFile(resolve(root, '.env'));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

const seedEvents = JSON.parse(
  readFileSync(resolve(root, 'api/data/events-seed.json'), 'utf8'),
);

const PLACES_OVERVIEW = `Triangle Networking Finder — 58 curated venues near Durham, NC 27707.`;

const memoryEvents = [...seedEvents];
const rateBuckets = new Map();

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'local';
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 3600000 };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return { allowed: bucket.count <= 20, remaining: Math.max(0, 20 - bucket.count) };
}

async function searchWeb(query) {
  if (!TAVILY_API_KEY) {
    return JSON.stringify({
      note: 'Web search unavailable locally (no TAVILY_API_KEY).',
      query,
    });
  }
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: `${query} Triangle NC`,
      max_results: 5,
      search_depth: 'basic',
      include_answer: true,
    }),
  });
  if (!response.ok) return JSON.stringify({ error: `Search failed (${response.status})` });
  return JSON.stringify(await response.json());
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for Triangle NC events.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_places',
      description: 'Filter places from catalog.',
      parameters: {
        type: 'object',
        properties: {
          categories: { type: 'array', items: { type: 'string' } },
          maxDriveTime: { type: 'number' },
          keywords: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_add_event',
      description: 'Propose adding an event.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string' },
          time: { type: 'string' },
          venue: { type: 'string' },
          city: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          url: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['id', 'title', 'date', 'venue', 'city', 'category', 'description', 'source'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_remove_event',
      description: 'Propose removing an event.',
      parameters: {
        type: 'object',
        properties: { eventId: { type: 'string' } },
        required: ['eventId'],
      },
    },
  },
];

async function handleChat(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const question = messages.at(-1)?.content?.trim() || '';
  const places = Array.isArray(body.places) ? body.places : [];
  const context = body.context ?? {};
  if (!question) throw new Error('A message is required.');
  if (!places.length) throw new Error('Place list is required.');

  const proposals = [];
  const openAiMessages = [
    {
      role: 'system',
      content: `${PLACES_OVERVIEW}\nCurrent events:\n${memoryEvents.map((e) => `- ${e.date} ${e.title}`).join('\n')}\nRespond JSON: {"message":"","recommendations":[],"proposed_events":[]}`,
    },
    { role: 'user', content: JSON.stringify({ question, context, places, priorMessages: messages.slice(0, -1) }) },
  ];

  for (let round = 0; round < 4; round++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        tools: TOOLS,
        messages: openAiMessages,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${detail.slice(0, 240)}`);
    }
    const data = await response.json();
    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error('Empty OpenAI response.');
    openAiMessages.push(choice);

    if (choice.tool_calls?.length) {
      for (const call of choice.tool_calls) {
        const args = JSON.parse(call.function.arguments || '{}');
        let result = '';
        if (call.function.name === 'search_web') result = await searchWeb(String(args.query ?? ''));
        else if (call.function.name === 'suggest_places') result = JSON.stringify({ places: places.slice(0, 8) });
        else if (call.function.name === 'propose_add_event') {
          const event = { ...args, disclaimer: 'Verify with organizer.' };
          proposals.push({ action: 'add', event });
          result = JSON.stringify({ proposed: true, event });
        } else if (call.function.name === 'propose_remove_event') {
          const eventId = String(args.eventId ?? '');
          const existing = memoryEvents.find((e) => e.id === eventId);
          proposals.push({ action: 'remove', event: existing ?? { id: eventId, title: eventId } });
          result = JSON.stringify({ proposed: true, eventId });
        }
        openAiMessages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: result });
      }
      continue;
    }

    const text = String(choice.content ?? '').trim();
    try {
      const parsed = JSON.parse(text);
      return {
        message: String(parsed.message ?? text),
        recommendations: parsed.recommendations ?? [],
        proposed_events: [...proposals, ...(parsed.proposed_events ?? [])],
      };
    } catch {
      return { message: text, recommendations: [], proposed_events: proposals };
    }
  }

  return { message: 'Try a simpler question.', recommendations: [], proposed_events: proposals };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/chat') {
    sendJson(res, 200, {
      configured: Boolean(OPENAI_API_KEY),
      model: OPENAI_MODEL,
      webSearch: Boolean(TAVILY_API_KEY),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    sendJson(res, 200, { events: memoryEvents, storage: 'memory' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    try {
      const body = await readBody(req);
      if (body.action === 'remove') {
        const eventId = String(body.eventId ?? '').trim();
        const idx = memoryEvents.findIndex((e) => e.id === eventId);
        if (idx === -1) sendJson(res, 404, { error: 'Event not found.' });
        else {
          memoryEvents.splice(idx, 1);
          sendJson(res, 200, { events: memoryEvents });
        }
        return;
      }
      const event = body.event ?? body;
      if (!event?.id || !event?.title || !event?.date) {
        sendJson(res, 400, { error: 'Invalid event payload.' });
        return;
      }
      memoryEvents.push(event);
      memoryEvents.sort((a, b) => a.date.localeCompare(b.date));
      sendJson(res, 200, { events: memoryEvents });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Failed.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    if (!OPENAI_API_KEY) {
      sendJson(res, 503, { error: 'OpenAI is not configured. Add OPENAI_API_KEY to .env.local.' });
      return;
    }
    const ip = req.socket.remoteAddress ?? 'local';
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
      sendJson(res, 429, { error: 'Rate limit exceeded (20 requests/hour).' });
      return;
    }
    try {
      const body = await readBody(req);
      const result = await handleChat(body);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Chat failed.' });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found.' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`API server listening on http://127.0.0.1:${PORT}`);
  console.log(OPENAI_API_KEY ? `OpenAI model: ${OPENAI_MODEL}` : 'Warning: OPENAI_API_KEY not set.');
});
