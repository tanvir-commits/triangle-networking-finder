import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './lib/cors';
import { enforceRateLimit } from './lib/rateLimit';
import { getEvents } from './lib/eventsStore';
import { PLACES_OVERVIEW, filterPlaces, type PlaceSummary } from './lib/placesContext';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type ProposedEvent = {
  action: 'add' | 'remove';
  event: Record<string, unknown>;
};

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_web',
      description:
        'Search the web for Triangle NC networking events, venues, or meetups. Use for upcoming events or venue verification.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query focused on Triangle NC area' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'suggest_places',
      description: 'Filter and rank places from the app catalog by category, drive time, or keywords.',
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
    type: 'function' as const,
    function: {
      name: 'propose_add_event',
      description:
        'Propose adding an upcoming Triangle event. User must confirm before it is saved.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          time: { type: 'string' },
          venue: { type: 'string' },
          city: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          url: { type: 'string' },
          source: { type: 'string' },
          disclaimer: { type: 'string' },
        },
        required: ['id', 'title', 'date', 'venue', 'city', 'category', 'description', 'source'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_remove_event',
      description: 'Propose removing an event by id. User must confirm.',
      parameters: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
        },
        required: ['eventId'],
      },
    },
  },
];

async function searchWeb(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return JSON.stringify({
      note: 'Web search unavailable (no TAVILY_API_KEY). Use general knowledge and tell the user to verify dates.',
      query,
    });
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${query} Triangle NC Durham Raleigh Cary`,
      max_results: 5,
      search_depth: 'basic',
      include_answer: true,
    }),
  });

  if (!response.ok) {
    return JSON.stringify({ error: `Search failed (${response.status})`, query });
  }

  const data = await response.json();
  return JSON.stringify({
    answer: data.answer,
    results: (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 300),
    })),
  });
}

function buildSystemPrompt(events: { id: string; title: string; date: string; venue: string }[]) {
  const eventsBlock = events.length
    ? events.map((e) => `- ${e.date} ${e.title} @ ${e.venue} (id: ${e.id})`).join('\n')
    : 'No events loaded yet.';

  return `You are the Triangle Networking Finder AI assistant.
User lives in Durham, NC 27707. The app helps find places to meet successful professionals and track upcoming Triangle events.

${PLACES_OVERVIEW}

Current events:
${eventsBlock}

Rules:
- Recommend only place IDs from the client place list.
- For events, use propose_add_event / propose_remove_event — never claim an event was saved.
- When web search is unavailable, say dates may need verification.
- Be concise, practical, and mobile-friendly.
- After tool use, respond with JSON only:
{
  "message": "friendly reply",
  "recommendations": [{ "placeId": "id", "reason": "why" }],
  "proposed_events": [{ "action": "add"|"remove", "event": { ... } }]
}`;
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  places: PlaceSummary[],
  events: { id: string; title: string; date: string; venue: string; city: string; category: string; description: string; source: string }[],
  proposals: ProposedEvent[],
): Promise<string> {
  switch (name) {
    case 'search_web':
      return searchWeb(String(args.query ?? ''));
    case 'suggest_places': {
      const matched = filterPlaces(places, {
        categories: Array.isArray(args.categories) ? args.categories.map(String) : undefined,
        maxDriveTime: typeof args.maxDriveTime === 'number' ? args.maxDriveTime : undefined,
        keywords: args.keywords ? String(args.keywords) : undefined,
      });
      return JSON.stringify({ places: matched });
    }
    case 'propose_add_event': {
      const event = {
        id: String(args.id),
        title: String(args.title),
        date: String(args.date),
        time: args.time ? String(args.time) : undefined,
        venue: String(args.venue),
        city: String(args.city),
        category: String(args.category),
        description: String(args.description),
        url: args.url ? String(args.url) : undefined,
        source: String(args.source),
        disclaimer: args.disclaimer
          ? String(args.disclaimer)
          : 'Verify date and details with the organizer.',
      };
      proposals.push({ action: 'add', event });
      return JSON.stringify({ proposed: true, event });
    }
    case 'propose_remove_event': {
      const eventId = String(args.eventId ?? '');
      const existing = events.find((e) => e.id === eventId);
      proposals.push({
        action: 'remove',
        event: existing ?? { id: eventId, title: eventId, date: '', venue: '', city: '', category: '', description: '', source: '' },
      });
      return JSON.stringify({ proposed: true, eventId });
    }
    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

async function callOpenAi(
  systemPrompt: string,
  userContent: string,
  places: PlaceSummary[],
  events: Awaited<ReturnType<typeof getEvents>>,
): Promise<{
  message: string;
  recommendations: { placeId: string; reason: string }[];
  proposed_events: ProposedEvent[];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.');

  const proposals: ProposedEvent[] = [];
  const messages: { role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  for (let round = 0; round < 4; round++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        tools: TOOLS,
        tool_choice: round === 0 ? 'auto' : 'auto',
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${detail.slice(0, 240)}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error('Empty OpenAI response.');

    messages.push(choice);

    const toolCalls = choice.tool_calls;
    if (toolCalls?.length) {
      for (const call of toolCalls) {
        const fn = call.function;
        const args = fn?.arguments ? JSON.parse(fn.arguments) : {};
        const result = await runTool(fn.name, args, places, events, proposals);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: fn.name,
          content: result,
        });
      }
      continue;
    }

    const text = String(choice.content ?? '').trim();
    try {
      const parsed = JSON.parse(text);
      return {
        message: String(parsed.message ?? text),
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        proposed_events: [
          ...proposals,
          ...(Array.isArray(parsed.proposed_events) ? parsed.proposed_events : []),
        ],
      };
    } catch {
      return { message: text, recommendations: [], proposed_events: proposals };
    }
  }

  return {
    message: 'I could not finish that request. Please try a simpler question.',
    recommendations: [],
    proposed_events: proposals,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: OPENAI_MODEL,
      webSearch: Boolean(process.env.TAVILY_API_KEY),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const limit = await enforceRateLimit(req);
  res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
  if (!limit.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded (20 requests/hour). Try again later.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI is not configured. Set OPENAI_API_KEY in Vercel env vars.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];
    const question = messages.at(-1)?.content?.trim() || String(body?.question ?? '').trim();
    const places = Array.isArray(body?.places) ? (body.places as PlaceSummary[]) : [];
    const context = body?.context ?? {};

    if (!question) return res.status(400).json({ error: 'A message is required.' });
    if (!places.length) return res.status(400).json({ error: 'Place list is required.' });

    const events = await getEvents();
    const systemPrompt = buildSystemPrompt(events);
    const userContent = JSON.stringify({
      question,
      context,
      places,
      priorMessages: messages.slice(0, -1).slice(-4),
    });

    const result = await callOpenAi(systemPrompt, userContent, places, events);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat request failed.';
    return res.status(500).json({ error: message });
  }
}
