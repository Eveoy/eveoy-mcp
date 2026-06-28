/**
 * The minimal session view a tool needs to log activity (its session id).
 * registerAll() passes this to every tool; logging tools use it, others ignore it.
 * The live EveoyMCP Durable Object satisfies it (getSessionId is inherited).
 */
export interface ToolAgent {
  getSessionId(): string;
}
