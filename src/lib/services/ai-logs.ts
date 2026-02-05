import { createAdminClient } from "@/lib/supabase/admin";

export interface AiLogData {
  userId: string;
  sessionId?: string;
  actionType: string;
  model: string;
  promptTemplate: string;
  promptVersion: number;
  contextPayload: Record<string, unknown>;
  fullPrompt: string;
  response: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  wasUsed: boolean;
}

export async function insertAiLog(data: AiLogData) {
  const supabase = createAdminClient();

  const { data: log, error } = await supabase
    .from("ai_logs")
    .insert({
      user_id: data.userId,
      session_id: data.sessionId ?? null,
      action_type: data.actionType,
      model: data.model,
      prompt_template: data.promptTemplate,
      prompt_version: data.promptVersion,
      context_payload: data.contextPayload,
      full_prompt: data.fullPrompt,
      response: data.response,
      tokens_in: data.tokensIn,
      tokens_out: data.tokensOut,
      latency_ms: data.latencyMs,
      was_used: data.wasUsed,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return log;
}
