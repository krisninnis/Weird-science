import { useEffect, useState } from "react";
import {
  createConversation,
  getLatestConversationForCompanion
} from "@/features/chat/repository/conversationRepository";
import {
  createMessage,
  getMessagesForConversation
} from "@/features/chat/repository/messageRepository";
import { getOnboardingSelection } from "@/features/onboarding/onboardingStorage";
import { analyseMessageForSignals } from "@/features/relationship/relationshipEngine";
import {
  getNextPhase,
  getTrustCapForPhase
} from "@/features/relationship/relationshipRules";
import {
  getRelationshipState,
  updateRelationshipPhase,
  updateTrust
} from "@/features/relationship/repository/relationshipRepository";

type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type ActiveCompanion = "mara" | "iris" | "rowan";

function buildTemporaryReply(
  companionId: ActiveCompanion,
  userText: string
): string {
  const text = userText.trim().toLowerCase();

  if (!text) {
    if (companionId === "mara") return "I'm here. You don't need to rush.";
    if (companionId === "iris") return "Take your time. We can stay with it.";
    return "I'm here. Take your time.";
  }

  if (text.includes("hello") || text.includes("hi")) {
    if (companionId === "mara") {
      return "Hi. I'm here with you. What feels heaviest today?";
    }
    if (companionId === "iris") {
      return "Hello. What's been sitting with you lately?";
    }
    return "Hi. I'm here with you. What's been on your mind today?";
  }

  if (text.includes("sad") || text.includes("lonely")) {
    if (companionId === "mara") {
      return "Thank you for saying that out loud. We can go gently. What has today felt like?";
    }
    if (companionId === "iris") {
      return "That sounds important. When you say lonely, what kind of loneliness is it?";
    }
    return "Thanks for saying that plainly. We don't have to rush past it. Do you want to tell me what today has felt like?";
  }

  if (text.includes("anxious") || text.includes("stress")) {
    if (companionId === "mara") {
      return "Alright. Let's steady this a little. What's the sharpest part of it right now?";
    }
    if (companionId === "iris") {
      return "Let's look at it carefully. What part feels most active in you right now?";
    }
    return "Alright. Let's slow it down a notch. What's the part that feels most pressing right now?";
  }

  if (companionId === "mara") {
    return "I'm with you. What's the part of that you most want understood?";
  }

  if (companionId === "iris") {
    return "Let's stay curious with it for a moment. What feels most important there?";
  }

  return "Got it. Stay with that for a second — what feels most important about it?";
}

function displayNameForCompanion(companionId: ActiveCompanion): string {
  if (companionId === "mara") return "Mara";
  if (companionId === "iris") return "Iris";
  return "Rowan";
}

export default function ChatScreen() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeCompanionId, setActiveCompanionId] =
    useState<ActiveCompanion>("rowan");

  useEffect(() => {
    const onboarding = getOnboardingSelection();
    if (onboarding?.companionId) {
      setActiveCompanionId(onboarding.companionId);
    }
  }, []);

  useEffect(() => {
    async function bootChat() {
      const onboarding = getOnboardingSelection();
      const companionId: ActiveCompanion = onboarding?.companionId ?? "rowan";

      const existingConversation =
        await getLatestConversationForCompanion(companionId);

      const conversation =
        existingConversation ??
        (await createConversation({
          companionId,
          title: `${displayNameForCompanion(companionId)} chat`
        }));

      setConversationId(conversation.id);

      const history = await getMessagesForConversation(conversation.id);
      setMessages(history);
    }

    void bootChat();
  }, [activeCompanionId]);

  async function handleSend() {
    if (!conversationId || !input.trim()) return;

    const userText = input.trim();

    await createMessage({
      conversationId,
      role: "user",
      content: userText
    });

    const signals = analyseMessageForSignals(userText);
    const relationship = await getRelationshipState(activeCompanionId);

    if (relationship) {
      let newTrust = relationship.trust + signals.trustDelta;

      const cap = getTrustCapForPhase(relationship.phase);
      if (newTrust > cap) {
        newTrust = cap;
      }

      newTrust = Number(newTrust.toFixed(2));

      const newPhase = getNextPhase(relationship.phase, newTrust);

      if (newTrust !== relationship.trust) {
        await updateTrust(activeCompanionId, newTrust);
      }

      if (newPhase !== relationship.phase) {
        await updateRelationshipPhase(activeCompanionId, newPhase);
        console.log("PHASE UPDATE:", relationship.phase, "→", newPhase);
      }
    }

    const assistantReply = buildTemporaryReply(activeCompanionId, userText);

    await createMessage({
      conversationId,
      role: "assistant",
      content: assistantReply
    });

    const updatedMessages = await getMessagesForConversation(conversationId);
    setMessages(updatedMessages);
    setInput("");
  }

  return (
    <section>
      <h1>Chat</h1>
      <p>
        Current companion:{" "}
        <strong>{displayNameForCompanion(activeCompanionId)}</strong>
      </p>

      <div
        style={{
          marginTop: "16px",
          padding: "16px",
          border: "1px solid #333",
          borderRadius: "12px",
          minHeight: "240px"
        }}
      >
        {messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                marginBottom: "12px",
                padding: "10px",
                borderRadius: "10px",
                background: message.role === "user" ? "#1e1e1e" : "#262626"
              }}
            >
              <strong>
                {message.role === "assistant"
                  ? displayNameForCompanion(activeCompanionId)
                  : message.role}
              </strong>
              <p style={{ marginBottom: 0 }}>{message.content}</p>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${displayNameForCompanion(activeCompanionId)}...`}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #444",
            background: "#1a1a1a",
            color: "#fff"
          }}
        />
        <button
          onClick={() => {
            void handleSend();
          }}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #444",
            background: "#2a2a2a",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Send
        </button>
      </div>
    </section>
  );
}