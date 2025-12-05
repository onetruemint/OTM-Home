import { KafkaBroker } from "@otm/kafka";
import { Logger } from "@otm/logger";
import { OllamaClient } from "@otm/ollama";

export interface CouncilMember {
  name: string;
  model: string;
  characteristic: string;
}

export interface MemberJson {
  members: CouncilMember[];
  elites: CouncilMember[];
}

export interface CouncilDiscussion {
  participant: OllamaClient;
  status: string;
  votes: number;
}

export enum CouncilStatus {
  ADJOURNED = "ADJOURNED",
  IN_SESSION = "IN_SESSION",
  EVALUATING = "EVALUATING",
}

export interface CouncilInterface {
  logger: Logger;
  councilKafka: KafkaBroker;
  members: OllamaClient[];
  elites: OllamaClient[];
  status: CouncilStatus;

  runCouncil(): Promise<void>;
  addToQueue(prompt: string): Promise<string>;
}
