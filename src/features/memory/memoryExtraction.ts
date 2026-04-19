import type { CreateMemoryInput } from "./repository/memoryRepository";

function normalizeValue(value: string): string {
  return value.trim().replace(/[.!?,;:]+$/g, "");
}

function buildTags(...values: string[]): string[] {
  return values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
}

export function extractMemoriesFromMessage(
  companionId: string,
  message: string,
  messageId: string
): CreateMemoryInput[] {
  const memories: CreateMemoryInput[] = [];
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return memories;
  }

  const emotionalMatch = trimmedMessage.match(/\bI feel\s+(.+?)(?:[.!?]|$)/i);
  if (emotionalMatch) {
    const feeling = normalizeValue(emotionalMatch[1]);
    const lowerFeeling = feeling.toLowerCase();
    const negativeFeeling =
      lowerFeeling.includes("sad") ||
      lowerFeeling.includes("lonely") ||
      lowerFeeling.includes("alone") ||
      lowerFeeling.includes("isolated");

    memories.push({
      companionId,
      type: "emotional_event",
      summary: `User felt ${feeling}`,
      detail: trimmedMessage,
      subject: "user",
      importance: 4,
      confidence: 0.9,
      valence: negativeFeeling ? "negative" : "neutral",
      sourceMessageIds: [messageId],
      tags: buildTags("emotion", ...lowerFeeling.split(/\s+/))
    });
  }

  const preferenceMatch = trimmedMessage.match(
    /\bI (like|love|hate)\s+(.+?)(?:[.!?]|$)/i
  );
  if (preferenceMatch) {
    const verb = preferenceMatch[1].toLowerCase();
    const preference = normalizeValue(preferenceMatch[2]);

    memories.push({
      companionId,
      type: "preference",
      summary: `User ${verb}s ${preference}`,
      detail: trimmedMessage,
      subject: "user",
      importance: 3,
      confidence: 0.85,
      valence:
        verb === "hate" ? "negative" : verb === "love" ? "positive" : "neutral",
      sourceMessageIds: [messageId],
      tags: buildTags("preference", verb, ...preference.toLowerCase().split(/\s+/))
    });
  }

  const lifeContextMatch = trimmedMessage.match(
    /\bI (work|live|have)\s+(.+?)(?:[.!?]|$)/i
  );
  if (lifeContextMatch) {
    const verb = lifeContextMatch[1].toLowerCase();
    const context = normalizeValue(lifeContextMatch[2]);

    memories.push({
      companionId,
      type: "fact",
      summary: `User ${verb}s ${context}`,
      detail: trimmedMessage,
      subject: "user",
      importance: 3,
      confidence: 0.75,
      valence: "neutral",
      sourceMessageIds: [messageId],
      tags: buildTags("life_context", verb, ...context.toLowerCase().split(/\s+/))
    });
  }

  const lonelinessMatch = trimmedMessage.match(/\b(lonely|alone|isolated)\b/i);
  if (lonelinessMatch) {
    const keyword = lonelinessMatch[1].toLowerCase();

    memories.push({
      companionId,
      type: "emotional_event",
      summary: `User feels ${keyword}`,
      detail: trimmedMessage,
      subject: "user",
      importance: 5,
      confidence: 0.8,
      valence: "negative",
      sourceMessageIds: [messageId],
      tags: buildTags("loneliness", keyword)
    });
  }

  return memories;
}
