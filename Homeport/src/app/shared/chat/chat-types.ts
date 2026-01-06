export type ChatBadge = 'FLOW' | 'AI FORM' | 'TOOL' | undefined;
export type ChatStatus = 'running' | 'success' | 'error' | 'warn' | 'info' | undefined;

export type RichPart = {
  kind: 'text' | 'tool' | 'log' | 'ai-form';
  text?: string;
  html?: string;
  tooltip?: string;
  tag?: string;
  name?: string;
  badge?: ChatBadge;
  status?: ChatStatus;
};

export function mergeText(base: string, add: string): string {
  const combined = (base || '') + (add || '');
  return combined.replace(/(\b)(\w+)(\s+\2\b)/gi, '$1$2');
}
