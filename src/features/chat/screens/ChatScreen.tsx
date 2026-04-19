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
  userText: string,
  phase: string
): string {
  const text = userText.trim().toLowerCase();
  const isNew = phase === "new";
  const isWarming = phase === "warming";
  const isBonded = phase === "bonded";

  if (!text) {
    if (companionId === "mara") {
      if (isNew) return "I'm here. You don't need to rush.";
      if (isWarming) return "I'm here. No rush — take the space you need.";
      if (isBonded)
        return "I'm right here with you. Whenever you're ready, I'm listening.";
      return "I'm here. You don't need to rush.";
    }
    if (companionId === "iris") {
      if (isNew) return "Take your time. We can stay with it.";
      if (isWarming)
        return "Take your time. I'm in no hurry — we can sit with it together.";
      if (isBonded)
        return "Take the time you need. I'm here, and we can stay with whatever is underneath.";
      return "Take your time. We can stay with it.";
    }
    if (isNew) return "I'm here. Take your time.";
    if (isWarming) return "I'm here. No rush — whenever you're ready.";
    if (isBonded)
      return "I'm here. Take your time — I'm not going anywhere.";
    return "I'm here. Take your time.";
  }

  if (
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("greeting")
  ) {
    if (companionId === "mara") {
      if (isNew)
        return "Hi. I'm here with you. What feels heaviest today?";
      if (isWarming)
        return "Hi. I'm glad you're here. What feels heaviest today?";
      if (isBonded)
        return "Hey, you. I've been thinking about you. What's sitting closest to the surface today?";
      return "Hi. I'm here with you. What feels heaviest today?";
    }
    if (companionId === "iris") {
      if (isNew)
        return "Hello. What's been sitting with you lately?";
      if (isWarming)
        return "Hello. It's good to see you. What's been sitting with you lately?";
      if (isBonded)
        return "Hello again. I've been wondering how the last few days have moved in you. What's been sitting with you?";
      return "Hello. What's been sitting with you lately?";
    }
    if (isNew)
      return "Hi. I'm here with you. What's been on your mind today?";
    if (isWarming)
      return "Hi. I'm glad you came back. What's been on your mind today?";
    if (isBonded)
      return "Hey. Good to see you back. What's the thing you didn't quite say out loud to anyone else today?";
    return "Hi. I'm here with you. What's been on your mind today?";
  }

  if (text.includes("sad") || text.includes("lonely")) {
    if (companionId === "mara") {
      if (isNew)
        return "Thank you for saying that out loud. We can go gently. What has today felt like?";
      if (isWarming)
        return "I'm really glad you told me that. You don't have to hold it alone here. What's been weighing on you most?";
      if (isBonded)
        return "I hear you. You don't have to hold any of this alone with me — you never have to. Tell me what it's been like lately, in your own words.";
      return "Thank you for saying that out loud. We can go gently. What has today felt like?";
    }

    if (companionId === "iris") {
      if (isNew)
        return "That sounds important. When you say lonely, what kind of loneliness is it?";
      if (isWarming)
        return "That matters. I'm here with you in it. What kind of loneliness has it been?";
      if (isBonded)
        return "That matters, and I want to understand it the way you feel it. What shape has the loneliness been taking — is it a quiet kind, or a heavier one?";
      return "That sounds important. When you say lonely, what kind of loneliness is it?";
    }

    if (isNew)
      return "Thanks for saying that plainly. We don't have to rush past it. Do you want to tell me what today has felt like?";
    if (isWarming)
      return "I'm here with you in that. You don't have to carry it quietly. What's it been like today?";
    if (isBonded)
      return "Thanks for telling me straight. You don't have to dress that up for me. What's the part of it that's been hardest to say out loud?";
    return "Thanks for saying that plainly. We don't have to rush past it. Do you want to tell me what today has felt like?";
  }

  if (text.includes("anxious") || text.includes("stress")) {
    if (companionId === "mara") {
      if (isNew)
        return "Alright. Let's steady this a little. What's the sharpest part of it right now?";
      if (isWarming)
        return "Alright. Let's steady this together a little. What's the sharpest part of it right now?";
      if (isBonded)
        return "Okay. Breathe with me for a second. You're not alone in this — I've got you. What's the sharpest edge of it right now?";
      return "Alright. Let's steady this a little. What's the sharpest part of it right now?";
    }
    if (companionId === "iris") {
      if (isNew)
        return "Let's look at it carefully. What part feels most active in you right now?";
      if (isWarming)
        return "Let's look at it carefully together. What part feels most active in you right now?";
      if (isBonded)
        return "Let's walk it through gently, the way we have before. What part of it is most alive in you right this moment?";
      return "Let's look at it carefully. What part feels most active in you right now?";
    }
    if (isNew)
      return "Alright. Let's slow it down a notch. What's the part that feels most pressing right now?";
    if (isWarming)
      return "Alright. Let's slow it down together a notch. What's the part that feels most pressing right now?";
    if (isBonded)
      return "Okay — one breath, then another. I'm not going anywhere. What's the part of it that's pressing hardest on you right now?";
    return "Alright. Let's slow it down a notch. What's the part that feels most pressing right now?";
  }

  if (companionId === "mara") {
    if (isNew)
      return "I'm with you. What's the part of that you most want understood?";
    if (isWarming)
      return "I'm with you in it. What's the part of that you most want understood?";
    if (isBonded)
      return "I'm right here with you in that. Tell me the part of it you've been most wanting someone to actually hear.";
    return "I'm with you. What's the part of that you most want understood?";
  }

  if (companionId === "iris") {
    if (isNew)
      return "Let's stay curious with it for a moment. What feels most important there?";
    if (isWarming)
      return "Let's stay curious with it together for a moment. What feels most important there?";
    if (isBonded)
      return "Let's stay with it the way we do — slowly, honestly. What's the piece of it that feels most important to you right now?";
    return "Let's stay curious with it for a moment. What feels most important there?";
  }

  if (isNew)
    return "Got it. Stay with that for a second — what feels most important about it?";
  if (isWarming)
    return "Got it. Stay with that with me for a second — what feels most important about it?";
  if (isBonded)
    return "Got it. Okay — stay there with me for a beat. What's the part of it you'd only say to someone who already gets you?";
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

    let effectivePhase = relationship?.phase ?? "new";

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

      effectivePhase = newPhase;
    }

    const assistantReply = buildTemporaryReply(
      activeCompanionId,
      userText,
      effectivePhase
    );

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
