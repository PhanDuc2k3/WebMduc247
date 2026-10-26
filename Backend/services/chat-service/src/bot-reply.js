export function plainBotReply(value, limit = 900) {
  return String(value || '').split(/\r?\n/)
    .filter(line => !/^\s*\|.*\|\s*$/.test(line))
    .join('\n').replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n').trim().slice(0, limit);
}
