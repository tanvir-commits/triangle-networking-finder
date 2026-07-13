import { useEffect, useRef, useState } from 'react';
import type { Place, UserData } from '../types/place';
import type { ProposedEventAction } from '../types/event';
import {
  buildAiContext,
  checkAiAvailable,
  normalizeProposedEvent,
  sendChatMessage,
  summarizePlacesForAi,
  type AiHealth,
  type ChatMessage,
} from '../utils/ai';
import { applyProposedEvent, persistEventToServer } from '../utils/events';
import { PlaceCard } from './PlaceCard';

const EXAMPLE_PROMPTS = [
  'What networking events are coming up this month?',
  'Best date-night spots within 25 minutes?',
  'Add a Triangle tech meetup I heard about',
  'Nightlife spots good for groups?',
];

type ChatPanelProps = {
  places: Place[];
  maxDriveTime: number;
  activeCategory: string;
  userData: UserData;
  expandedId: string | null;
  onToggleExpand: (placeId: string) => void;
  onToggleFavorite: (placeId: string) => void;
  onToggleVisited: (placeId: string) => void;
  onRatingChange: (placeId: string, rating: number) => void;
  onNotesChange: (placeId: string, notes: string) => void;
  onEventsChanged: () => void;
};

type PendingProposal = ProposedEventAction & { key: string };

export function ChatPanel({
  places,
  maxDriveTime,
  activeCategory,
  userData,
  expandedId,
  onToggleExpand,
  onToggleFavorite,
  onToggleVisited,
  onRatingChange,
  onNotesChange,
  onEventsChanged,
}: ChatPanelProps) {
  const [health, setHealth] = useState<AiHealth | null | undefined>(undefined);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState<{ placeId: string; reason: string }[]>([]);
  const [pendingProposals, setPendingProposals] = useState<PendingProposal[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (health === undefined) {
      checkAiAvailable().then((result) => setHealth(result));
    }
  }, [health]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, pendingProposals]);

  const handleSend = async (prompt = input) => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError('');
    setRecommendations([]);
    setPendingProposals([]);

    try {
      const result = await sendChatMessage({
        messages: nextMessages,
        places: summarizePlacesForAi(places),
        context: buildAiContext(maxDriveTime, activeCategory, userData),
      });

      setMessages([...nextMessages, { role: 'assistant', content: result.message }]);
      setRecommendations(result.recommendations ?? []);
      const proposals = (result.proposed_events ?? []).map((item, index) => ({
        ...normalizeProposedEvent(item),
        key: `${item.action}-${index}-${Date.now()}`,
      }));
      setPendingProposals(proposals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the AI service.');
    } finally {
      setLoading(false);
    }
  };

  const confirmProposal = async (proposal: PendingProposal) => {
    applyProposedEvent(proposal);
    await persistEventToServer(proposal);
    setPendingProposals((current) => current.filter((p) => p.key !== proposal.key));
    onEventsChanged();
  };

  const recommendedPlaces = recommendations
    .map((entry) => places.find((place) => place.id === entry.placeId))
    .filter((place): place is Place => Boolean(place));

  return (
    <section className="chat-page" aria-label="AI chat">
      <div className="chat-page-header">
        <div>
          <h2>AI Assistant</h2>
          <p className="chat-subtitle">
            {health?.configured
              ? `Powered by ${health.model}${health.webSearch ? ' + web search' : ''}`
              : health === undefined
                ? 'Checking AI availability…'
                : 'AI unavailable — check connection or try again later'}
          </p>
        </div>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask about places, events, or nightlife near Durham 27707.</p>
            <div className="ai-examples">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setInput(prompt);
                    void handleSend(prompt);
                  }}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={msg.role === 'user' ? 'chat-bubble user' : 'chat-bubble assistant'}
          >
            {msg.content}
          </div>
        ))}

        {loading && <div className="chat-bubble assistant">Thinking…</div>}
        {error && <p className="ai-error">{error}</p>}

        {pendingProposals.map((proposal) => (
          <div key={proposal.key} className="confirm-card">
            <p>
              <strong>{proposal.action === 'add' ? 'Add event?' : 'Remove event?'}</strong>
            </p>
            <p>
              {proposal.title} · {proposal.date} · {proposal.venue}
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => void confirmProposal(proposal)}>
                Confirm
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setPendingProposals((current) => current.filter((p) => p.key !== proposal.key))
                }
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}

        {recommendedPlaces.length > 0 && (
          <div className="chat-recommendations">
            {recommendations.map((entry) => {
              const place = places.find((item) => item.id === entry.placeId);
              if (!place) return null;
              return (
                <div key={entry.placeId} className="ai-result-block">
                  <p className="ai-reason">{entry.reason}</p>
                  <PlaceCard
                    place={place}
                    userData={userData[place.id]}
                    expanded={expandedId === place.id}
                    onToggleExpand={() => onToggleExpand(place.id)}
                    onToggleFavorite={() => onToggleFavorite(place.id)}
                    onToggleVisited={() => onToggleVisited(place.id)}
                    onRatingChange={(rating) => onRatingChange(place.id, rating)}
                    onNotesChange={(notes) => onNotesChange(place.id, notes)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about places or events…"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <button type="button" className="btn" onClick={() => void handleSend()} disabled={loading}>
          Send
        </button>
      </div>
    </section>
  );
}
