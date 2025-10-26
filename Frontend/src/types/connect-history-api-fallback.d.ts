declare module 'connect-history-api-fallback' {
  import type { RequestHandler } from 'express';
  function history(options?: any): RequestHandler;
  export = history;
}
