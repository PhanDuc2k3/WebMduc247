import { SHOPPING_SYSTEM_PROMPT } from './system-prompt.js';
import { plainBotReply } from './bot-reply.js';
const privateData = /(?:sk-ant-[\w-]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|(?:\+?84|0)\d{9,10}\b|địa chỉ|dia chi|số nhà|so nha|mật khẩu|mat khau|password|thẻ tín dụng|the tin dung|cvv|access token)/i;
export const redactPrivateData = value => privateData.test(String(value || '')) ?
  '[Nội dung riêng tư đã ẩn]' : String(value || '');

// Some compatible proxies return signed thinking blocks even when thinking is disabled.
// Preserve them unchanged for tool continuation; only text blocks may become a public reply.
export function validClaudeBlock(block) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return false;
  if (block.type === 'text') return typeof block.text === 'string';
  if (block.type === 'thinking') return typeof block.thinking === 'string' &&
    (block.signature == null || typeof block.signature === 'string');
  if (block.type === 'redacted_thinking') return typeof block.data === 'string';
  if (block.type === 'tool_use') return typeof block.id === 'string' && typeof block.name === 'string' &&
    block.input != null && typeof block.input === 'object' && !Array.isArray(block.input);
  return false;
}

export class ClaudeProxy {
  constructor({ apiKey, baseUrl = 'https://1gw.gwai.cloud', model = 'claude-haiku-5-5',
    maxTokens = 160, dailyLimit = 20, fetcher = fetch } = {}) {
    if (!apiKey) throw new Error('CHAT_CLAUDE_API_KEY is required');
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('CHAT_CLAUDE_BASE_URL must be an HTTPS origin');
    }
    if (!/^claude-haiku-[a-z0-9-]+$/.test(model)) throw new Error('CHAT_CLAUDE_MODEL must be a Haiku model');
    if (!Number.isInteger(maxTokens) || maxTokens < 32 || maxTokens > 512) throw new Error('Invalid Claude output limit');
    if (!Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 1000) throw new Error('Invalid Claude daily limit');
    this.apiKey = apiKey;
    this.url = new URL('/v1/messages', url);
    this.model = model;
    this.maxTokens = maxTokens;
    this.dailyLimit = dailyLimit;
    this.fetcher = fetcher;
    this.day = '';
    this.calls = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
  }
  eligible(text) { return typeof text === 'string' && !privateData.test(text); }
  async createMessage({ messages, tools = [], maxTokens = this.maxTokens, system = SHOPPING_SYSTEM_PROMPT } = {}) {
    const day = new Date().toISOString().slice(0, 10);
    if (this.day !== day) { this.day = day; this.calls = 0; }
    if (this.calls >= this.dailyLimit) return null;
    this.calls++;
    const payload = {
      model: this.model,
      max_tokens: Math.min(Math.max(maxTokens, 32), 512),
      ...(this.model.startsWith('claude-haiku-5-5') ? { thinking: { type: 'disabled' } } : {}),
      system,
      messages,
      ...(tools.length ? { tools, tool_choice: { type: 'auto', disable_parallel_tool_use: true } } : {}),
    };
    const started = performance.now();
    let response;
    try {
      response = await this.fetcher(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': this.apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(18_000),
      });
    } catch (error) {
      console.warn('Claude proxy request failed', { model: this.model, reason: error.name,
        latencyMs: Math.round(performance.now() - started) });
      throw error;
    }
    if (!response.ok) {
      console.warn('Claude proxy rejected request', { model: this.model, status: response.status,
        latencyMs: Math.round(performance.now() - started) });
      throw new Error(`Claude proxy returned HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data.content) || data.content.length > 16 || data.content.some(block => !validClaudeBlock(block)))
      throw Object.assign(new Error('Claude proxy returned invalid content'), { code: 'INVALID_PROVIDER_CONTENT' });
    const usage = { inputTokens: Number(data.usage?.input_tokens || 0),
      outputTokens: Number(data.usage?.output_tokens || 0) };
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
    if (usage.inputTokens || usage.outputTokens) console.info('Claude proxy usage', {
      model: data.model || this.model, stopReason: data.stop_reason || 'end_turn',
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      latencyMs: Math.round(performance.now() - started) });
    return { content: data.content, stopReason: data.stop_reason || 'end_turn',
      model: data.model || this.model, usage, latencyMs: Math.round(performance.now() - started) };
  }
  async replyDetailed(question, facts = '') {
    if (!this.eligible(question)) return null;
    const result = await this.createMessage({ messages: [{ role: 'user',
      content: `Câu hỏi: ${question.slice(0, 300)}\nDữ liệu liên quan: ${facts.slice(0, 1600) || 'Không có dữ liệu cụ thể.'}` }] });
    if (!result) return null;
    const answer = result.content.filter(block => block.type === 'text')
      .map(block => String(block.text || '')).join(' ').trim();
    if (!answer) throw new Error('Claude proxy returned an empty response');
    return { reply: plainBotReply(answer), metadata: { aiUsed: true, model: result.model,
      latencyMs: result.latencyMs, usage: result.usage, toolCalls: 0 } };
  }
  async reply(question, facts = '') { return (await this.replyDetailed(question, facts))?.reply || null; }
}
