import { OllamaClient } from "@platform/ollama";

export interface CouncilMember {
  name: string;
  model: string;
  characteristic: string;
}

export interface MemberJson {
  members: CouncilMember[];
  elites: CouncilMember[];
}

export interface CouncilInterface {
  members: OllamaClient[];
  elites: OllamaClient[];
}

export interface CouncilDiscussion {
  participant: OllamaClient,
  status: string,
  votes: number,
}
