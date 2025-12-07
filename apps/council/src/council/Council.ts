import { Ollama, OllamaClient, OllamaModel } from "@otm/ollama";
import { CouncilMember, CouncilStatus, MemberJson } from "../types/Council";
import * as utils from "@otm/utils";
import * as compute from "./compute";

export default class Council {
  members: OllamaClient[] = [];
  elites: OllamaClient[] = [];
  status: CouncilStatus = CouncilStatus.ADJOURNED;

  // Timing constants in milliseconds

  private constructor(members: OllamaClient[], elites: OllamaClient[]) {
    this.members = members;
    this.elites = elites;
  }

  /** Council Business Logic */

  static async createCouncil(): Promise<Council> {
    const councilJson = `${__dirname}/members.json`;
    const data = await utils.readFileSync(councilJson);
    const council: MemberJson = JSON.parse(data);

    const members = await this.loadBoard(council.members);
    const elites = await this.loadBoard(council.elites);

    return new Council(members, elites);
  }

  private static async loadBoard(
    council: CouncilMember[],
  ): Promise<OllamaClient[]> {
    const availableModels = await Ollama.listModels();
    const modelSet = new Set(
      availableModels.models.map((item: OllamaModel) => item.name),
    );

    const councilMembers: OllamaClient[] = [];

    for (const member of council) {
      if (!modelSet.has(member.name)) {
        if (!modelSet.has(member.model)) {
          await Ollama.pull({
            model: member.model,
            stream: false,
          });
        }

        const createRes = await Ollama.createModel({
          model: member.name,
          from: member.model,
          system: member.characteristic,
          stream: false,
        });

        if (createRes.status !== "success") {
          throw new Error(
            `Creating model ${member.name} failed, response status: ${createRes.status}`,
          );
        }
      }

      councilMembers.push(await Ollama.createOllama(member.name));
    }

    return councilMembers;
  }

  async vote(prompt: string, discussionTimeMs?: number) {
    // Run all discussion phases in sequence
    this.status = CouncilStatus.EVALUATING;
    const generalResults = await compute.generalDiscussion(
      this.members,
      prompt,
      discussionTimeMs,
    );

    this.status = CouncilStatus.EVALUATING;
    const votes = await compute.eliteDiscussion(this.elites, generalResults);

    const finalResults = await compute.finalAnswer(votes);

    this.status = CouncilStatus.ADJOURNED;
    return finalResults;
  }
}
