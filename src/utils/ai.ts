import type { Place, UserData } from '../types/place';
import type { ProposedEventAction } from '../types/event';
import { getApiBaseUrl } from './settings';

export type AiPlaceSummary = {
  id: string;
  name: string;
  category: string;
  city: string;
  driveTimeMinutes: number;
  estimatedCost: string;
  audience: string;
  whyItFits: string;
  bestFor: string[];
  couplesFriendly: boolean;
  wifeFriendly: boolean;
  networkingPotential: string;
};

export type AiRecommendation = {
  placeId: string;
  reason: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatResponse = {
  message: string;
  recommendations: AiRecommendation[];
  proposed_events: { action: 'add' | 'remove'; event: Record<string, unknown> }[];
};

export type AiHealth = {
  configured: boolean;
  model: string;
  webSearch: boolean;
};

type StructuredChatPayload = {
  message?: string;
  recommendations?: AiRecommendation[];
  proposed_events?: ChatResponse['proposed_events'];
};

function extractJsonPayload(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // continue
    }
  }

  return null;
}

function parseStructuredChatPayload(text: string): StructuredChatPayload | null {
  const parsed = extractJsonPayload(text);
  if (!parsed || typeof parsed !== 'object' || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  if (!('message' in record) && !('recommendations' in record) && !('proposed_events' in record)) {
    return null;
  }

  return {
    message: record.message != null ? String(record.message) : undefined,
    recommendations: Array.isArray(record.recommendations)
      ? (record.recommendations as AiRecommendation[])
      : undefined,
    proposed_events: Array.isArray(record.proposed_events)
      ? (record.proposed_events as ChatResponse['proposed_events'])
      : undefined,
  };
}

export function normalizeChatResponse(data: ChatResponse): ChatResponse {
  let message = data.message ?? '';
  let recommendations = data.recommendations ?? [];
  let proposed_events = data.proposed_events ?? [];

  const structured = parseStructuredChatPayload(message);
  if (structured) {
    if (structured.message) message = structured.message;
    if (structured.recommendations?.length) recommendations = structured.recommendations;
    if (structured.proposed_events?.length) proposed_events = structured.proposed_events;
  }

  return { message, recommendations, proposed_events };
}

export function summarizePlacesForAi(places: Place[]): AiPlaceSummary[] {
  return places.map((place) => ({
    id: place.id,
    name: place.name,
    category: place.category,
    city: place.city,
    driveTimeMinutes: place.driveTimeMinutes,
    estimatedCost: place.estimatedCost,
    audience: place.audience,
    whyItFits: place.whyItFits,
    bestFor: place.bestFor,
    couplesFriendly: place.couplesFriendly,
    wifeFriendly: place.wifeFriendly,
    networkingPotential: place.networkingPotential,
  }));
}

export function buildAiContext(
  maxDriveTime: number,
  activeCategory: string,
  userData: UserData,
) {
  const shortlistIds = Object.entries(userData)
    .filter(([, entry]) => entry.favorite)
    .map(([id]) => id);
  const visitedIds = Object.entries(userData)
    .filter(([, entry]) => entry.visited)
    .map(([id]) => id);
  const notesSummary = Object.entries(userData)
    .filter(([, entry]) => entry.notes?.trim())
    .slice(0, 8)
    .map(([id, entry]) => `${id}: ${entry.notes!.slice(0, 80)}`);

  return { maxDriveTime, activeCategory, shortlistIds, visitedIds, notesSummary };
}

export async function checkAiAvailable(): Promise<AiHealth | null> {
  const apiRoot = getApiBaseUrl();
  if (!apiRoot) return null;

  try {
    const response = await fetch(`${apiRoot}/chat`);
    if (!response.ok) return null;
    return (await response.json()) as AiHealth;
  } catch {
    return null;
  }
}

export async function sendChatMessage(input: {
  messages: ChatMessage[];
  places: AiPlaceSummary[];
  context: ReturnType<typeof buildAiContext>;
}): Promise<ChatResponse> {
  const apiRoot = getApiBaseUrl();
  if (!apiRoot) {
    throw new Error('AI chat is unavailable. Check your connection and try again.');
  }

  const response = await fetch(`${apiRoot}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as ChatResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'AI request failed.');
  }

  return normalizeChatResponse(data);
}

export function normalizeProposedEvent(
  raw: { action: 'add' | 'remove'; event: Record<string, unknown> },
): ProposedEventAction {
  const e = raw.event;
  return {
    action: raw.action,
    id: e.id ? String(e.id) : undefined,
    title: String(e.title ?? 'Untitled event'),
    date: String(e.date ?? ''),
    time: e.time ? String(e.time) : undefined,
    venue: String(e.venue ?? ''),
    city: e.city ? String(e.city) : undefined,
    category: String(e.category ?? 'Other'),
    url: e.url ? String(e.url) : undefined,
    source: e.source ? String(e.source) : undefined,
    description: e.description ? String(e.description) : undefined,
  };
}
