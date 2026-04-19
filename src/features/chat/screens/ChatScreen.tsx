import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import { Link } from "react-router-dom";
import {
  createConversation,
  getLatestConversationForCompanion
} from "@/features/chat/repository/conversationRepository";
import {
  createMessage,
  getMessagesForConversation
} from "@/features/chat/repository/messageRepository";
import {
  getCompanionById,
  type CompanionRecord
} from "@/features/companion/repository/companionRepository";
import type {
  CompanionCore,
  CompanionMood,
  CompanionProfile,
  CompanionShape
} from "@/features/companion/companionTypes";
import { getOnboardingSelection } from "@/features/onboarding/onboardingStorage";
import {
  getRelationshipState,
  mapRelationshipRecordToState,
  saveRelationshipState
} from "@/features/relationship/repository/relationshipRepository";
import {
  analyseMessageForSignals,
  calculateRelationshipUpdate
} from "@/features/relationship/relationshipEngine";
import { streamChat } from "@/lib/llm/ollamaClient";
import { buildPrompt } from "@/lib/llm/promptBuilder";

type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type ActiveCompanion = "mara" | "iris" | "rowan";

type RelationshipSnapshot = {
  phase: string;
  trust: number;
  familiarity: number;
  openness: number;
  tension: number;
  playfulness: number;
  romanticCharge: number;
  dependencyRisk: number;
};

type SuggestionChip = {
  id: string;
  label: string;
  text: string;
};

type OnboardingSummary = {
  clientName?: string;
  chapter?: string | null;
  presence?: string | null;
  supportStyle?: string | null;
  companionId?: ActiveCompanion;
  relationshipMode?: string | null;
};

const companionSummaries: Record<
  ActiveCompanion,
  {
    subtitle: string;
    intro: string;
    tone: string;
    strengths: string[];
  }
> = {
  mara: {
    subtitle: "Grounded protector",
    intro: "Warm, observant, and good at helping the room settle.",
    tone: "Steady, reassuring, and emotionally containing.",
    strengths: ["Grounding", "Warmth", "Steadiness"]
  },
  iris: {
    subtitle: "Reflective mentor",
    intro:
      "Thoughtful, precise, and less interested in pretending than understanding.",
    tone: "Reflective, articulate, and emotionally intelligent.",
    strengths: ["Clarity", "Reflection", "Depth"]
  },
  rowan: {
    subtitle: "Ungendered catalyst",
    intro: "Dry, steady, and useful when you need momentum without theatrics.",
    tone: "Grounded, lightly irreverent, and emotionally safe.",
    strengths: ["Momentum", "Honesty", "Perspective"]
  }
};

function displayNameForCompanion(companionId: ActiveCompanion): string {
  if (companionId === "mara") return "Mara";
  if (companionId === "iris") return "Iris";
  return "Rowan";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatChapter(chapter: string | null | undefined): string {
  if (!chapter) return "General";
  return chapter
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toRelationshipSnapshot(
  record: Awaited<ReturnType<typeof getRelationshipState>>
): RelationshipSnapshot | null {
  if (!record) return null;

  const state = mapRelationshipRecordToState(record);

  return {
    phase: state.phase,
    trust: state.trust,
    familiarity: state.familiarity,
    openness: state.openness,
    tension: state.tension,
    playfulness: state.playfulness,
    romanticCharge: state.romanticCharge,
    dependencyRisk: state.dependencyRisk
  };
}

function readOnboardingSummary(): OnboardingSummary {
  const onboarding = getOnboardingSelection() as Record<string, unknown> | null;

  if (!onboarding) {
    return {};
  }

  return {
    clientName:
      typeof onboarding.clientName === "string"
        ? onboarding.clientName
        : typeof onboarding.name === "string"
          ? onboarding.name
          : undefined,
    chapter:
      typeof onboarding.chapter === "string" ? onboarding.chapter : undefined,
    presence:
      typeof onboarding.presence === "string" ? onboarding.presence : undefined,
    supportStyle:
      typeof onboarding.supportStyle === "string"
        ? onboarding.supportStyle
        : undefined,
    companionId:
      onboarding.companionId === "mara" ||
      onboarding.companionId === "iris" ||
      onboarding.companionId === "rowan"
        ? onboarding.companionId
        : undefined,
    relationshipMode:
      typeof onboarding.relationshipMode === "string"
        ? onboarding.relationshipMode
        : typeof onboarding.romancePreference === "string"
          ? onboarding.romancePreference
          : undefined
  };
}

function buildSuggestionChips(
  companionId: ActiveCompanion,
  summary: OnboardingSummary
): SuggestionChip[] {
  const chapterLabel = formatChapter(summary.chapter);

  if (companionId === "mara") {
    return [
      {
        id: "mara-1",
        label: "Start gently",
        text: "I feel stretched thin today and I don't know where to start."
      },
      {
        id: "mara-2",
        label: "Caregiving strain",
        text: `The ${chapterLabel.toLowerCase()} part of this is getting harder to carry alone.`
      },
      {
        id: "mara-3",
        label: "Body check-in",
        text: "Can we slow things down for a moment? I feel keyed up."
      }
    ];
  }

  if (companionId === "iris") {
    return [
      {
        id: "iris-1",
        label: "Untangle this",
        text: "There's something I keep circling and I want to understand it properly."
      },
      {
        id: "iris-2",
        label: "Name what's hard",
        text: `I think the ${chapterLabel.toLowerCase()} part is changing how I feel about everything.`
      },
      {
        id: "iris-3",
        label: "Reflect with me",
        text: "Can we look at what today brought up without rushing to fix it?"
      }
    ];
  }

  return [
    {
      id: "rowan-1",
      label: "Be direct",
      text: "I need you to help me say the thing I've been avoiding."
    },
    {
      id: "rowan-2",
      label: "Reality check",
      text: `I feel stuck in the ${chapterLabel.toLowerCase()} pattern and I want a clear way to talk about it.`
    },
    {
      id: "rowan-3",
      label: "Plainly",
      text: "Can we skip the fluff and get to what matters today?"
    }
  ];
}

function messageDateLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function normaliseRecentTurns(messages: ChatMessage[]): Array<{
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}> {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    createdAt: message.createdAt
  }));
}

function mapCompanionRecordToProfile(
  record: CompanionRecord | null
): CompanionProfile | null {
  if (!record) return null;

  return {
    core: JSON.parse(record.core_json) as CompanionCore,
    shape: JSON.parse(record.shape_json) as CompanionShape,
    mood: JSON.parse(record.mood_json) as CompanionMood
  };
}

function buildPromptInput(args: {
  companionProfile: CompanionProfile | null;
  relationshipRecord: Awaited<ReturnType<typeof getRelationshipState>>;
  recentMessages: ChatMessage[];
}) {
  const relationshipState = args.relationshipRecord
    ? mapRelationshipRecordToState(args.relationshipRecord)
    : null;

  if (!args.companionProfile) {
    throw new Error("Companion profile could not be loaded.");
  }

  return {
    companion: args.companionProfile,
    relationshipState,
    retrievedMemories: [],
    recentTurns: normaliseRecentTurns(args.recentMessages),
    maxBudgetTokens: 2200
  } as Parameters<typeof buildPrompt>[0];
}

export default function ChatScreen(): JSX.Element {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeCompanionId, setActiveCompanionId] =
    useState<ActiveCompanion>("rowan");
  const [relationship, setRelationship] = useState<RelationshipSnapshot | null>(
    null
  );
  const [chapterLabel, setChapterLabel] = useState("General");
  const [isBooting, setIsBooting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const messagePaneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onboarding = readOnboardingSummary();

    if (onboarding.companionId) {
      setActiveCompanionId(onboarding.companionId);
    }

    setChapterLabel(formatChapter(onboarding.chapter));
  }, []);

  useEffect(() => {
    async function bootChat(): Promise<void> {
      setIsBooting(true);
      setLastError(null);

      try {
        const onboarding = readOnboardingSummary();
        const companionId: ActiveCompanion = onboarding.companionId ?? "rowan";

        const existingConversation =
          await getLatestConversationForCompanion(companionId);

        const conversation =
          existingConversation ??
          (await createConversation({
            companionId,
            title: `${displayNameForCompanion(companionId)} chat`
          }));

        setConversationId(conversation.id);
        setMessages(await getMessagesForConversation(conversation.id));
        setRelationship(
          toRelationshipSnapshot(await getRelationshipState(companionId))
        );
      } catch (error) {
        console.error(error);
        setLastError("The chat shell opened, but the session could not be restored.");
      } finally {
        setIsBooting(false);
      }
    }

    void bootChat();
  }, [activeCompanionId]);

  useEffect(() => {
    if (!messagePaneRef.current) return;
    messagePaneRef.current.scrollTop = messagePaneRef.current.scrollHeight;
  }, [messages, isSending]);

  const companionMeta = useMemo(
    () => companionSummaries[activeCompanionId],
    [activeCompanionId]
  );

  const onboardingSummary = useMemo(() => readOnboardingSummary(), []);

  const suggestionChips = useMemo(
    () => buildSuggestionChips(activeCompanionId, onboardingSummary),
    [activeCompanionId, onboardingSummary]
  );

  const groupedMessages = useMemo(() => {
    const groups: Array<{ key: string; label: string; messages: ChatMessage[] }> =
      [];

    for (const message of messages) {
      const key = new Date(message.createdAt).toDateString();
      const label = messageDateLabel(message.createdAt);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.key !== key) {
        groups.push({ key, label, messages: [message] });
      } else {
        lastGroup.messages.push(message);
      }
    }

    return groups;
  }, [messages]);

  const relationshipHighlights = useMemo(() => {
    if (!relationship) {
      return [
        { label: "Phase", value: "new" },
        { label: "Trust", value: "20%" },
        { label: "Familiarity", value: "10%" },
        { label: "Dependency risk", value: "0%" }
      ];
    }

    return [
      { label: "Phase", value: relationship.phase },
      { label: "Trust", value: formatPercent(relationship.trust) },
      {
        label: "Familiarity",
        value: formatPercent(relationship.familiarity)
      },
      {
        label: "Dependency risk",
        value: formatPercent(relationship.dependencyRisk)
      }
    ];
  }, [relationship]);

  async function refreshSessionState(
    targetConversationId?: string
  ): Promise<void> {
    const resolvedConversationId = targetConversationId ?? conversationId;
    if (!resolvedConversationId) return;

    setMessages(await getMessagesForConversation(resolvedConversationId));
    setRelationship(
      toRelationshipSnapshot(await getRelationshipState(activeCompanionId))
    );
  }

  async function ensureConversationId(): Promise<string> {
    if (conversationId) {
      return conversationId;
    }

    const existingConversation =
      await getLatestConversationForCompanion(activeCompanionId);

    if (existingConversation) {
      setConversationId(existingConversation.id);
      return existingConversation.id;
    }

    const createdConversation = await createConversation({
      companionId: activeCompanionId,
      title: `${displayNameForCompanion(activeCompanionId)} chat`
    });

    setConversationId(createdConversation.id);
    return createdConversation.id;
  }

  async function handleSend(customText?: string): Promise<void> {
    if (isSending) return;

    const userText = (customText ?? input).trim();
    if (!userText) return;

    const resolvedConversationId = await ensureConversationId();

    setIsSending(true);
    setLastError(null);
    setStatusMessage("Writing to the session ledger…");

    try {
      const userCreatedAt = new Date().toISOString();

      await createMessage({
        conversationId: resolvedConversationId,
        role: "user",
        content: userText
      });

      const optimisticUserMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId: resolvedConversationId,
        role: "user",
        content: userText,
        createdAt: userCreatedAt
      };

      const recentMessagesForPrompt = [...messages, optimisticUserMessage];
      setMessages(recentMessagesForPrompt);
      setInput("");

      setStatusMessage("Updating relationship state…");

      const signals = analyseMessageForSignals(userText);
      const relationshipRecord = await getRelationshipState(activeCompanionId);

      if (relationshipRecord) {
        const currentState = mapRelationshipRecordToState(relationshipRecord);
        const result = calculateRelationshipUpdate({
          previousState: currentState,
          signals
        });

        await saveRelationshipState(result.nextState);
        setRelationship({
          phase: result.nextState.phase,
          trust: result.nextState.trust,
          familiarity: result.nextState.familiarity,
          openness: result.nextState.openness,
          tension: result.nextState.tension,
          playfulness: result.nextState.playfulness,
          romanticCharge: result.nextState.romanticCharge,
          dependencyRisk: result.nextState.dependencyRisk
        });
      }

      setStatusMessage("Building companion prompt…");

      const companionRecord = await getCompanionById(activeCompanionId);
      const companionProfile = mapCompanionRecordToProfile(companionRecord);

      const prompt = buildPrompt(
        buildPromptInput({
          companionProfile,
          relationshipRecord: await getRelationshipState(activeCompanionId),
          recentMessages: recentMessagesForPrompt
        })
      );

      const placeholderAssistantId = crypto.randomUUID();
      const placeholderCreatedAt = new Date().toISOString();

      setMessages((previous) => [
        ...previous,
        {
          id: placeholderAssistantId,
          conversationId: resolvedConversationId,
          role: "assistant",
          content: "",
          createdAt: placeholderCreatedAt
        }
      ]);

      let fullResponse = "";
      setStatusMessage("Streaming companion reply…");

      const streamHandle = await streamChat({
        model: "llama3.2",
        messages: prompt.messages,
        onChunk: (chunk: string) => {
          fullResponse += chunk;

          setMessages((previous) =>
            previous.map((message) =>
              message.id === placeholderAssistantId
                ? { ...message, content: fullResponse }
                : message
            )
          );
        }
      });

      const completedResponse = await streamHandle.completion;
      const finalAssistantReply = completedResponse.trim();

      if (!finalAssistantReply) {
        throw new Error("The local model returned an empty reply.");
      }

      await createMessage({
        conversationId: resolvedConversationId,
        role: "assistant",
        content: finalAssistantReply
      });

      await refreshSessionState(resolvedConversationId);
      setStatusMessage(null);
    } catch (error) {
      console.error(error);
      setLastError(
        "Something interrupted the exchange. Your message was saved, but the reply did not complete."
      );
      await refreshSessionState(resolvedConversationId);
      setStatusMessage(null);
    } finally {
      setIsSending(false);
    }
  }

  function handleComposerKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function handleSuggestionClick(text: string): void {
    setInput(text);
  }

  return (
    <main className="screen-shell chat-shell">
      <aside className="chat-sidebar">
        <p className="eyebrow">Companion</p>

        <div className="hero-status">
          <span className="status-dot" aria-hidden="true" />
          <span className="system-value">
            {isSending ? "Session active" : "Private link stable"}
          </span>
        </div>

        <h1>{displayNameForCompanion(activeCompanionId)}</h1>
        <p className="companion-subtitle">{companionMeta.subtitle}</p>
        <p className="screen-copy">{companionMeta.intro}</p>

        <div className="diagnostic-grid">
          <div className="dossier-card">
            <p className="system-label">Tone</p>
            <h3>{companionMeta.tone}</h3>
            <p>{companionMeta.strengths.join(" • ")}</p>
          </div>

          <div className="dossier-card">
            <p className="system-label">Chapter</p>
            <h3>{chapterLabel}</h3>
            <p>
              {onboardingSummary.supportStyle
                ? `Support style: ${onboardingSummary.supportStyle}`
                : "The relationship can shape itself gradually from here."}
            </p>
          </div>
        </div>

        <div className="sidebar-card">
          <p className="system-label">Relationship snapshot</p>
          <h2>Current state</h2>
          <div className="relationship-grid">
            {relationshipHighlights.map((item) => (
              <div key={item.label} className="relationship-stat">
                <span className="relationship-stat-label">{item.label}</span>
                <strong className="relationship-stat-value">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-card">
          <p className="system-label">Application summary</p>
          <h2>Client profile</h2>
          <div className="summary-stack">
            {onboardingSummary.clientName ? (
              <p>
                <strong>Name:</strong> {onboardingSummary.clientName}
              </p>
            ) : null}
            <p>
              <strong>Chapter:</strong> {chapterLabel}
            </p>
            {onboardingSummary.presence ? (
              <p>
                <strong>Presence:</strong> {onboardingSummary.presence}
              </p>
            ) : null}
            {onboardingSummary.relationshipMode ? (
              <p>
                <strong>Mode:</strong> {onboardingSummary.relationshipMode}
              </p>
            ) : null}
          </div>
        </div>

        <div className="sidebar-actions">
          <Link className="secondary-button" to="/vault">
            Open vault
          </Link>
          <Link className="ghost-button" to="/">
            Revisit onboarding
          </Link>
        </div>
      </aside>

      <section className="chat-stage">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Chat</p>
            <h2>{displayNameForCompanion(activeCompanionId)}</h2>
            <p className="chat-header-note">
              A private thread shaped slowly by memory, mood, and phase.
            </p>
          </div>

          <div className="status-stack">
            <span className="status-chip is-accent">
              {relationship?.phase ?? "new"} phase
            </span>
            <span className="status-chip">
              {relationship ? formatPercent(relationship.trust) : "20%"} trust
            </span>
          </div>
        </header>

        <section className="suggestion-strip" aria-label="Conversation starters">
          {suggestionChips.map((chip) => (
            <button
              key={chip.id}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(chip.text)}
              type="button"
            >
              {chip.label}
            </button>
          ))}
        </section>

        <div ref={messagePaneRef} className="message-pane">
          {isBooting ? (
            <div className="message-empty-state">
              <p className="system-label">Restoring thread</p>
              <h3>Loading your session</h3>
              <p>Pulling together the most recent conversation and relationship state.</p>
            </div>
          ) : groupedMessages.length === 0 ? (
            <div className="message-empty-state">
              <p className="system-label">No transcript yet</p>
              <h3>Start with something ordinary</h3>
              <p>
                The best first message is usually a small true thing: what today
                felt like, what is weighing on you, or what you need from this
                companion right now.
              </p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <section key={group.key} className="message-group">
                <div className="message-date-divider">
                  <span>{group.label}</span>
                </div>

                {group.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message-card${
                      message.role === "user" ? " is-user" : " is-assistant"
                    }`}
                  >
                    <div className="message-meta">
                      <p className="message-role">
                        {message.role === "assistant"
                          ? displayNameForCompanion(activeCompanionId)
                          : message.role === "user"
                            ? "You"
                            : "System"}
                      </p>
                      <time className="message-time" dateTime={message.createdAt}>
                        {new Date(message.createdAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </time>
                    </div>
                    <p>{message.content}</p>
                  </article>
                ))}
              </section>
            ))
          )}

          {isSending ? (
            <article className="message-card is-assistant is-pending">
              <div className="message-meta">
                <p className="message-role">
                  {displayNameForCompanion(activeCompanionId)}
                </p>
                <span className="message-time">typing…</span>
              </div>
              <p className="typing-indicator">
                <span />
                <span />
                <span />
              </p>
            </article>
          ) : null}
        </div>

        <footer className="composer-shell">
          <label className="composer-label" htmlFor="chat-composer">
            Say what is true, even if it is small.
          </label>

          {statusMessage ? (
            <p className="composer-status" role="status">
              {statusMessage}
            </p>
          ) : null}

          {lastError ? (
            <p className="composer-error" role="alert">
              {lastError}
            </p>
          ) : null}

          <textarea
            id="chat-composer"
            className="composer-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={`Message ${displayNameForCompanion(activeCompanionId)}...`}
            rows={4}
            disabled={isSending || isBooting}
          />

          <div className="composer-actions">
            <p className="muted-copy">
              Enter to send. Shift+Enter for a new line.
            </p>
            <button
              className="primary-button"
              onClick={() => void handleSend()}
              disabled={isSending || isBooting || input.trim().length === 0}
              type="button"
            >
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}