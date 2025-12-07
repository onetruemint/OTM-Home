import * as utils from "@otm/utils";

export const SERVICE_NAME = "otm-home.council";
export const GENERAL_DISCUSSION_TIME = 7 * utils.ONE_MINUTE;
export const MAX_QUEUE_SIZE = 100;
export const QUEUE_WARNING_THRESHOLD = 75;

// Memory optimization: Limit AI response sizes
export const MAX_AI_RESPONSE_LENGTH = 5000; // characters
export const RESPONSE_WARNING_LENGTH = 4000; // characters
