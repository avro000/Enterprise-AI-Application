import type { ChatIntent, Confidence } from "./format";
import { chatApi } from "@/services/api";

export interface ChatSource {
  type: "document" | "database";
  name?: string;
  page?: number;
  relevance?: number;
  table?: string;
  detail?: string;
}

export interface ChatAnswer {
  answer: string;
  intent: ChatIntent;
  sources: ChatSource[];
  confidence: Confidence;
}

export async function askCopilot(question: string): Promise<ChatAnswer> {
  // Dispatches query to live FastAPI enterprise LLM endpoint with real Gemini model
  try {
    const live = await chatApi.send(question);
    if (live && live.answer) {
      return {
        answer: live.answer,
        intent: (live.intent as ChatIntent) || "hybrid",
        sources: (live.sources || []) as ChatSource[],
        confidence: (live.confidence as Confidence) || "high",
      };
    }
    throw new Error("No response received from AI engine");
  } catch (err: any) {
    console.error("FastAPI chat service error:", err);
    const detail = err?.response?.data?.detail || err?.message || "Failed to contact AI service";
    throw new Error(detail);
  }
}
