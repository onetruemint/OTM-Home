import { EventEmitter } from "events";
import { Ollama, OllamaClient, OllamaModel } from "@otm/ollama";
import {
  CouncilDiscussion,
  CouncilInterface,
  CouncilMember,
  CouncilStatus,
  MemberJson,
} from "../types/Council";
import * as utils from "@otm/utils";
import { KafkaBroker, topics, useKafkaConfig } from "@otm/kafka";
import { IncomingCouncilMessage } from "../messaging/CouncilTopics";
import { Logger } from "@otm/logger";

export default class Council implements CouncilInterface {
  logger: Logger;
  councilKafka: KafkaBroker;
  members: OllamaClient[];
  elites: OllamaClient[];
  status: CouncilStatus;
  private queue: string[];
  private queueEmitter: EventEmitter;

  // Timing constants in milliseconds
  private static readonly GENERAL_DISCUSSION_TIME = 7 * utils.ONE_MINUTE; // 7 minutes
  private static readonly COUNCIL_CLIENT_ID = "otm-home.council";

  private constructor(
    kafkaConnection: KafkaBroker,
    members: OllamaClient[],
    elites: OllamaClient[],
    logger: Logger,
  ) {
    this.councilKafka = kafkaConnection;
    this.members = members;
    this.elites = elites;
    this.status = CouncilStatus.ADJOURNED;
    this.queue = [];
    this.queueEmitter = new EventEmitter();
    this.logger = logger;
  }

  /** Kafka */
  private static async establishKafka() {
    const config = useKafkaConfig();
    config.clientId = Council.COUNCIL_CLIENT_ID;
    const broker = new KafkaBroker(config);
    await broker.connect();

    return broker;
  }

  private async councilPromptHandler(
    _: string,
    message: IncomingCouncilMessage | null,
  ) {
    if (message) {
      this.addToQueue(message.prompt);
    }
  }

  private async councilSubscribe() {
    await this.councilKafka.subscribe(
      topics.council.queue,
      this.councilPromptHandler,
    );
  }

  /** Council Business Logic */

  static async createCouncil(logger: Logger): Promise<Council> {
    const councilJson = `${__dirname}/members.json`;
    const data = await utils.readFileSync(councilJson);
    const council: MemberJson = JSON.parse(data);

    const members = await this.loadCouncil(council.members);
    const elites = await this.loadCouncil(council.elites);

    const broker = await this.establishKafka();

    return new Council(broker, members, elites, logger);
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

  private async vote(prompt: string) {
    this.logger.info(`[Council] Starting vote on prompt: ${prompt}`);

    // Run all discussion phases in sequence
    const generalResults = await this.generalDiscussion(prompt);
    this.logger.info(JSON.stringify(generalResults, null, 2));
    const votes = await this.eliteDiscussion(generalResults);

    const finalResults = await this.finalAnswer(votes);
    this.logger.info(finalResults);

    return finalResults;
  }

  private async generalDiscussion(prompt: string) {
    this.logger.info(`[Council] Starting general discussion`);
    this.status = CouncilStatus.IN_SESSION;
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
      this.logger.info(`[Council] General discussion round ${votingRound}`);
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
        if (discussion[index]) {
          discussion[index].status = prevDiscussionStatus;
        }
      }
    }

    return discussion;
  }

  private async eliteDiscussion(
    discussions: CouncilDiscussion[],
  ): Promise<CouncilDiscussion[]> {
    this.logger.info(`[Council] Engaging in Elite voting.`);
    this.status = CouncilStatus.EVALUATING;

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

  private async finalAnswer(discussions: CouncilDiscussion[]): Promise<string> {
    const bestDiscussion = discussions.reduce((acc, discussion) => {
      if (!acc || discussion.votes > acc.votes) {
        return discussion;
      }
      return acc;
    }, discussions[0]);

    this.status = CouncilStatus.ADJOURNED;

    return bestDiscussion?.status || "";
  }

  /** Council Management */

  async runCouncil(): Promise<void> {
    await this.councilKafka.connect();
    await this.councilSubscribe();

    await this.voteLoop();
  }

  async addToQueue(prompt: string): Promise<string> {
    try {
      this.queue.push(prompt);
      this.queueEmitter.emit("itemAdded");
    } catch (error) {
      this.logger?.error(`Error adding to queue: ${error}`);
    }
    return `Prompt added successfully ${prompt}`;
  }

  private async voteLoop() {
    while (true) {
      if (this.queue.length === 0) {
        // Wait for an item to be added to the queue
        await new Promise((resolve) =>
          this.queueEmitter.once("itemAdded", resolve),
        );
      }

      const prompt = String(this.queue.shift());
      const answer = await this.vote(prompt);

      await this.councilKafka.publish(topics.council.processed, answer);
    }
  }
}
