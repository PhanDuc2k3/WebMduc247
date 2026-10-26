import { plainBotReply } from './bot-reply.js';
import { catalogReply } from './shopping-response.js';
import { validClaudeBlock } from './claude-proxy.js';
const MAX_TOOL_ROUNDS = 2;
const MAX_TOOL_CALLS = 3;
const textBlocks = content => (content || []).filter(block => block.type === 'text')
  .map(block => String(block.text || '')).join(' ').trim();
const validProduct = product => product && typeof product.id === 'string' && typeof product.name === 'string' &&
  Number.isSafeInteger(product.priceMinor) && product.priceMinor >= 0 && Number.isSafeInteger(product.stock) && product.stock >= 0 &&
  typeof product.inStock === 'boolean' && product.inStock === (product.stock > 0);

export class ShoppingAssistant {
  constructor(ai, tools) { this.ai = ai; this.tools = tools; }
  async respond({ question, history = [], user = null, bearer = '', requireTool = false, allowedToolNames = null, search = null }) {
    if (!this.ai?.eligible(question)) return null;
    const safeHistory = history.filter(item => ['user','bot'].includes(item.role) &&
      typeof item.text === 'string' && this.ai.eligible(item.text) &&
      !(item.sourceRefs || []).some(ref => ref.startsWith('order:'))).slice(-4)
      .map(item => ({ role: item.role === 'bot' ? 'assistant' : 'user', content: item.text.slice(0, 250) }));
    const messages = [...safeHistory, { role: 'user', content: question.slice(0, 300) }];
    const products = new Map(), stores = new Map(), sourceRefs = new Set();
    let comparison = null, calls = 0, rounds = 0, inputTokens = 0, outputTokens = 0;
    let model = null, toolError = null, policyUnavailable = null, authoritativeReply = null, catalogRead = false;
    const comparing = /so sánh|so sanh|khác nhau|khac nhau|cái nào|cai nao/i.test(question);
    const candidateTools = requireTool ? this.tools.schemas().filter(tool =>
      ['search_products','get_product_details',...(comparing ? ['compare_products'] : [])].includes(tool.name)) : this.tools.schemas();
    const availableTools = allowedToolNames == null ? candidateTools : candidateTools.filter(tool => allowedToolNames.includes(tool.name));
    const allowed = new Set(availableTools.map(tool => tool.name));
    const started = performance.now();
    while (rounds <= MAX_TOOL_ROUNDS) {
      const result = await this.ai.createMessage({ messages, tools: availableTools,
        maxTokens: rounds === 0 ? 256 : 160 });
      if (!result) { console.info('Shopping assistant fallback', { reason: 'provider-budget' }); return null; }
      model = result.model;
      inputTokens += result.usage?.inputTokens || 0;
      outputTokens += result.usage?.outputTokens || 0;
      if (!Array.isArray(result.content) || result.content.some(block => !validClaudeBlock(block)) ||
        !['tool_use','end_turn'].includes(result.stopReason)) return null;
      const uses = result.content.filter(block => block.type === 'tool_use');
      if (!uses.length || result.stopReason !== 'tool_use') {
        const reply = plainBotReply(textBlocks(result.content));
        if (!catalogRead && !authoritativeReply && !policyUnavailable &&
          /₫|\bVND\b|(?:giá|gia)\s*(?:chỉ|chi|là|la|từ|tu|bán|ban)?\s*\d|(?:còn|con)\s*\d+\s*(?:sản phẩm|san pham|chiếc|chiec)|(?:giảm|giam)\s*\d+\s*%/i.test(reply)) return null;
        if ((!reply && !authoritativeReply && !policyUnavailable) ||
          requireTool && !catalogRead) {
          console.info('Shopping assistant fallback', { reason: 'missing-grounded-result',
            stopReason: result.stopReason, toolCalls: calls });
          return null;
        }
        return { reply: authoritativeReply || policyUnavailable || (catalogRead ? catalogReply([...products.values()], comparison) : reply), products: [...products.values()], stores: [...stores.values()],
          comparison, sourceRefs: [...sourceRefs],
          metadata: { aiUsed: true, model, latencyMs: Math.round(performance.now() - started),
            usage: { inputTokens, outputTokens }, toolCalls: calls,
            ...(toolError ? { limited: true } : {}) } };
      }
      if (rounds >= MAX_TOOL_ROUNDS || calls + uses.length > MAX_TOOL_CALLS) {
        console.info('Shopping assistant fallback', { reason: 'tool-limit', toolCalls: calls });
        return null;
      }
      const results = [];
      for (const block of uses) {
        if (!allowed.has(block.name) || typeof block.id !== 'string' || !block.input || typeof block.input !== 'object' || Array.isArray(block.input)) return null;
        calls++;
        try {
          const output = await this.tools.execute(block.name, block.input, { user, bearer, search });
          if (!output || !output.data || typeof output.data !== 'object' || Array.isArray(output.data) ||
            output.products != null && (!Array.isArray(output.products) || output.products.some(product => !validProduct(product))) ||
            output.sourceRefs != null && (!Array.isArray(output.sourceRefs) || output.sourceRefs.some(ref => typeof ref !== 'string'))) throw new Error('Invalid tool response');
          if (['search_products','get_product_details','compare_products'].includes(block.name)) catalogRead = true;
          for (const item of output.products || []) products.set(item.id, item);
          for (const item of output.stores || []) stores.set(item.id, item);
          for (const ref of output.sourceRefs || []) sourceRefs.add(ref);
          if (output.comparison) comparison = output.comparison;
          if (block.name === 'get_platform_policy' && output.data?.available === false)
            policyUnavailable = `${output.data.message} ${output.data.url}`;
          if (block.name === 'get_order_status' && output.data?.loginRequired)
            authoritativeReply = output.data.message;
          else if (block.name === 'get_order_status') authoritativeReply = `Trạng thái đơn hàng của bạn: ${output.data.status}. Xem chi tiết tại /orders.`;
          if (['get_voucher_information','get_applicable_vouchers'].includes(block.name) && output.data?.valid === false)
            authoritativeReply = output.data.reason;
          else if (['get_voucher_information','get_applicable_vouchers'].includes(block.name))
            authoritativeReply = output.data.message || 'Điều kiện voucher được kiểm tra lại tại checkout.';
          results.push({ type: 'tool_result', tool_use_id: block.id,
            content: block.name === 'get_order_status' ? JSON.stringify({ message: 'Backend đã xử lý quyền truy cập và sẽ hiển thị kết quả trực tiếp cho người dùng.' }) : JSON.stringify(output.data).slice(0, 4500) });
        } catch (error) {
          toolError = error;
          if (!authoritativeReply) authoritativeReply = 'Mình chưa thể xác minh dữ liệu hiện tại. Bạn vui lòng thử lại sau.';
          if (block.name === 'get_order_status' && error.status < 500)
            authoritativeReply = error.message;
          results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true,
            content: error.status && error.status < 500 ? error.message : 'Dịch vụ dữ liệu tạm thời chưa sẵn sàng.' });
        }
      }
      messages.push({ role: 'assistant', content: result.content });
      messages.push({ role: 'user', content: results });
      rounds++;
    }
    return null;
  }
}
