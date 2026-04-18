export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  companionId: string;
  startedAt: string;
  endedAt: string | null;
  title: string | null;
}

export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
}

export interface CreateConversationInput {
  companionId: string;
  title?: string | null;
}