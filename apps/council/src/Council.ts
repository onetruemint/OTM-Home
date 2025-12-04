import { Ollama, OllamaClient, OllamaModel } from "@otm/ollama";
import {
  CouncilDiscussion,
  CouncilInterface,
  CouncilMember,
  MemberJson,
} from "./types/Council";
import * as utils from "@otm/utils";

export default class Council implements CouncilInterface {
  members: OllamaClient[];
  elites: OllamaClient[];

  // Timing constants in milliseconds
  private static readonly GENERAL_DISCUSSION_TIME = 7 * 60 * 1000; // 7 minutes

  private constructor(members: OllamaClient[], elites: OllamaClient[]) {
    this.members = members;
    this.elites = elites;
  }

  static async createCouncil(): Promise<Council> {
    const councilJson = `${__dirname}/members.json`;
    const data = await utils.readFileSync(councilJson);
    const council: MemberJson = JSON.parse(data);
    console.info(`Creating Council from ${JSON.stringify(council, null, 2)}`);

    console.info(`Loading members ${JSON.stringify(council.members, null, 2)}`);
    const members = await this.loadCouncil(council.members);
    console.info(`Loading elites: ${JSON.stringify(council.elites, null, 2)}`);
    const elites = await this.loadCouncil(council.elites);

    return new Council(members, elites);
  }

  private static async loadCouncil(
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
          console.warn(`${member.model} not found, pulling.`);
          await Ollama.pull({
            model: member.model,
            stream: false,
          });
        }

        console.info(
          `Creating model from ${member.model} named ${member.name}`,
        );
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

  async vote(prompt: string) {
    console.info(`[Council] Starting vote on prompt: ${prompt}`);

    // Run all discussion phases in sequence
    const generalResults = await this.generalDiscussion(prompt);
    console.info(JSON.stringify(generalResults, null, 2));
    const votes = await this.eliteDiscussion(generalResults);

    const finalResults = await this.finalAnswer(votes);
    console.info(finalResults);

    return finalResults;
  }

  async generalDiscussion(prompt: string) {
    console.info(`[Council] Starting general discussion`);
    const startTime = Date.now();
    const endTime = startTime + Council.GENERAL_DISCUSSION_TIME;
    const discussion: CouncilDiscussion[] = this.members.map((participant) => ({
      participant,
      status: "",
      votes: 0,
    }));
    let prevDiscussionStatus = prompt;
    let votingRound = 0;

    while (Date.now() < endTime) {
      votingRound += 1;
      console.info(`[Council] General discussion round ${votingRound}`);
      for (const [index, discussionObj] of discussion.entries()) {
        if (Date.now() > endTime) {
          break;
        }

        const participant = discussionObj.participant;

        const res = await participant.generate({
          model: participant.model,
          prompt: JSON.stringify({
            phase: "General Discussion",
            originalPrompt: prompt,
            discussionStatus: prevDiscussionStatus,
            duty: "If you agree with the current discussionStatus, simply repeat it with no modifications. Otherwise, refine the statement to be better.",
          }),
          stream: false,
        });

        prevDiscussionStatus = res.response;
        console.info(votingRound, prevDiscussionStatus);
        if (discussion[index]) {
          discussion[index].status = prevDiscussionStatus;
        }
      }
    }

    return discussion;
  }

  async eliteDiscussion(
    discussions: CouncilDiscussion[],
  ): Promise<CouncilDiscussion[]> {
    console.info(`[Council] Engaging in Elite voting.`);
    for (const discussion of discussions) {
      for (const elite of this.elites) {
        const res = await elite.generate({
          model: elite.model,
          prompt: JSON.stringify({
            phase: "Voting Phase",
            conclusion: JSON.stringify(discussion.status),
            duty: "If you agree with the current discussionStatus, simply vote with the number 1. Otherwise, vote 0",
          }),
          stream: false,
        });

        if (res.response.indexOf("1") > -1) {
          discussion.votes += 1;
        }
      }
    }

    return discussions;
  }

  async finalAnswer(discussions: CouncilDiscussion[]): Promise<string> {
    const bestDiscussion = discussions.reduce((acc, discussion) => {
      if (!acc || discussion.votes > acc.votes) {
        return discussion;
      }
      return acc;
    }, discussions[0]);

    return bestDiscussion?.status || "";
  }
}

async function main() {
  const council = await Council.createCouncil();
  await council.vote(
    "What is the best place for an American to purchase PC parts from Shenzhen, China? Weigh in factors such as reliability, quality, and affordability.",
  );
  // await council.eliteDiscussion([
  //   {
  //     participant: await Ollama.createOllama("MemberGemma:latest"),
  //     status:
  //       "What is the best place for an American to purchase PC parts from Shenzhen, China? Weigh in factors such as reliability, quality, and affordability.",
  //     votes: 0,
  //   },
  //   {
  //     participant: await Ollama.createOllama("MemberGwen:latest"),
  //     status:
  //       "What is the best place for an American to purchase PC parts from Shenzhen, China? Weigh in factors such as reliability, quality, and affordability.",
  //     votes: 0,
  //   },
  //   {
  //     participant: await Ollama.createOllama("MemberLlama:latest"),
  //     status:
  //       "What is the best place for an American to purchase PC parts from Shenzhen, China? Weigh in factors such as reliability, quality, and affordability.",
  //     votes: 0,
  //   },
  //   {
  //     participant: await Ollama.createOllama("MemberMistral:latest"),
  //     status:
  //       "What is the best place for an American to purchase PC parts from Shenzhen, China? Weigh in factors such as reliability, quality, and affordability.",
  //     votes: 0,
  //   },
  // ]);
}

main();
