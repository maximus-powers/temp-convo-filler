import type { LanguageModelV2Middleware } from '@ai-sdk/provider';

/**
 * Simple test middleware to verify wrapStream is called
 */
export function testStreamMiddleware(): LanguageModelV2Middleware {
  return {
    middlewareVersion: 'v2',
    
    transformParams: async ({ params, type }) => {
      console.log('[TEST MIDDLEWARE] transformParams called with type:', type);
      return params;
    },
    
    wrapStream: async ({ doStream, params }) => {
      console.log('[TEST MIDDLEWARE] ===== WRAPSTREAM CALLED! =====');
      console.log('[TEST MIDDLEWARE] Params:', Object.keys(params));
      
      const result = await doStream();
      console.log('[TEST MIDDLEWARE] Original stream result keys:', Object.keys(result));
      
      // Pass through the original stream unchanged
      return result;
    }
  };
}