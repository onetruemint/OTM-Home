import { OllamaClient } from "@otm/ollama";
import { CouncilDiscussion } from "../types/Council";
import * as consts from "../consts";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "council-compute" });

/**
 * Memory optimization: Truncate AI responses that exceed maximum length
 */
function truncateResponse(response: string): string {
  if (response.length > consts.MAX_AI_RESPONSE_LENGTH) {
    logger.warn(
      `Response length (${response.length}) exceeds maximum (${consts.MAX_AI_RESPONSE_LENGTH}). Truncating.`,
      { responseLength: response.length, maxLength: consts.MAX_AI_RESPONSE_LENGTH }
    );
    return response.substring(0, consts.MAX_AI_RESPONSE_LENGTH) + "...";
  }

  if (response.length > consts.RESPONSE_WARNING_LENGTH) {
    logger.warn(
      `Response length (${response.length}) approaching maximum (${consts.MAX_AI_RESPONSE_LENGTH})`,
      { responseLength: response.length, maxLength: consts.MAX_AI_RESPONSE_LENGTH }
    );
  }

  return response;
}

export async function generalDiscussion(
  generalBoard: OllamaClient[],
  prompt: string,
  discussionTimeMs?: number,
): Promise<CouncilDiscussion[]> {
  const startTime = Date.now();
  // Use provided discussionTimeMs or default to GENERAL_DISCUSSION_TIME
  const discussionDuration = discussionTimeMs ?? consts.GENERAL_DISCUSSION_TIME;
  const endTime = startTime + discussionDuration;
  const discussion: CouncilDiscussion[] = generalBoard.map((participant) => ({
    participant,
    status: "",
    votes: 0,
  }));
  let prevDiscussionStatus = prompt;
  let votingRound = 0;

  while (Date.now() < endTime) {
    votingRound += 1;
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

      // Memory optimization: Truncate response to prevent memory spikes
      prevDiscussionStatus = truncateResponse(res.response);
      if (discussion[index]) {
        discussion[index].status = prevDiscussionStatus;
      }
    }
  }

  return discussion;
}

export async function eliteDiscussion(
  eliteBoard: OllamaClient[],
  discussions: CouncilDiscussion[],
): Promise<CouncilDiscussion[]> {
  for (const discussion of discussions) {
    for (const elite of eliteBoard) {
      const res = await elite.generate({
        model: elite.model,
        prompt: JSON.stringify({
          phase: "Voting Phase",
          conclusion: JSON.stringify(discussion.status),
          duty: "If you agree with the current discussionStatus, simply vote with the number 1. Otherwise, vote 0",
        }),
        stream: false,
      });

      // Memory optimization: Truncate response (voting responses should be short)
      const voteResponse = truncateResponse(res.response);
      if (voteResponse.indexOf("1") > -1) {
        discussion.votes += 1;
      }
    }
  }

  return discussions;
}

export async function finalAnswer(
  discussions: CouncilDiscussion[],
): Promise<string> {
  const bestDiscussion = discussions.reduce((acc, discussion) => {
    if (!acc || discussion.votes > acc.votes) {
      return discussion;
    }
    return acc;
  }, discussions[0]);

  return bestDiscussion?.status || "";
}
