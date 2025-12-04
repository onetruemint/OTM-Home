export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason: string;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface OllamaGenerateOptions {
  model?: string;
  prompt?: string;
  suffix?: string;
  images?: string[];
  format?: string | object;
  system?: string;
  stream?: boolean;
  think?: boolean;
  raw?: boolean;
  keep_alive?: string | number;
  options?: object;
  logprobs?: boolean;
  top_logprobs?: number;
}

export interface OllamaResponse {
  tags: OllamaTagResponse;
  default: OllamaBasicResponse;
  generate: OllamaGenerateResponse;
}

export interface OllamaTagResponse {
  models: OllamaModel[];
}

export interface OllamaBasicResponse {
  status: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
  };
  parameter_size: string;
  quantization_level: string;
}

export interface OllamaCreateModelOptions {
  model: string;
  from?: string;
  system?: string;
  template?: string;
  license?: string | string[];
  parameters?: object;
  messages?: object[];
  quantize?: string;
  stream?: boolean;
}

export interface OllamaPullModelOptions {
  model: string;
  insecure?: boolean;
  stream?: boolean;
}

export interface OllamaClient {
  model: string;

  generate(options: OllamaGenerateOptions): Promise<OllamaGenerateResponse>;
}
