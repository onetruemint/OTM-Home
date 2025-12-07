import { PromptStatus } from "../types/Council";

export interface IncomingCouncilMessage {
  prompt: string;
  discussionTimeMs?: number; // Optional: User-specified discussion time in milliseconds
}

export interface ResponseSavedMessage {
  id: string;
  prompt: string;
  answer: string;
  createdAt: Date;
}

export interface PromptStatusChangedMessage {
  id: string;
  prompt: string;
  status: PromptStatus;
  answer?: string;
  processingTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}
