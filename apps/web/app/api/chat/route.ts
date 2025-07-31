import { streamText, wrapLanguageModel, streamNaturalTextMiddleware, convertToModelMessages } from 'ai';
import { testStreamMiddleware } from '../../../../../packages/ai/src/middleware/test-middleware';
import { openai } from '@ai-sdk/openai';

async function createNaturalTextModel() {
  // Create the primary OpenAI model
  const primaryModel = openai('gpt-4');
  
  // Configure the middleware exactly as in the working demo
  const middlewareConfig = {
    huggingfaceEndpointUrl: process.env.HUGGINGFACE_ENDPOINT_URL!,
    huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY!,
    temperature: 0.7,
    maxTokens: 64,
    thoughtDelay: 100,
    silenceDelay: 1000,
    fallbackBehavior: 'passthrough' as const,
    onMetricsUpdate: (metrics: any) => {
      console.log('[DEBUG] ⚡ onMetricsUpdate callback triggered!');
      console.log('[DEBUG] Metrics object:', JSON.stringify(metrics, null, 2));
      
      // Check if thoughts and fullText exist in the metrics
      if (metrics.thoughts && metrics.thoughts.length > 0) {
        console.log('🧠 [GPT-4 THOUGHTS] Complete list:', metrics.thoughts);
      } else {
        console.log('🧠 [GPT-4 THOUGHTS] ❌ Empty or missing thoughts array');
      }
      
      if (metrics.fullText && metrics.fullText.trim()) {
        console.log('🤖 [SMOL-LM COMPLETE] Full generated text:', metrics.fullText);
      } else {
        console.log('🤖 [SMOL-LM COMPLETE] ❌ Empty or missing fullText');
      }
      
      // Additional debugging
      console.log('[DEBUG] All metric keys:', Object.keys(metrics));
    }
  };
  
  // Wrap with actual middleware using the real Vercel AI SDK
  console.log('[DEBUG] Creating wrapped model with streamNaturalText middleware...');
  const naturalModel = wrapLanguageModel({
    model: primaryModel,
    middleware: streamNaturalTextMiddleware(middlewareConfig)
  });
  console.log('[DEBUG] Wrapped model created successfully');
  
  return naturalModel;
}

export async function POST(req: Request) {
  try {
    console.log('Chat API called');
    const { messages } = await req.json();
    console.log('Received messages:', JSON.stringify(messages, null, 2));

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages must be provided as an array');
    }

    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    
    if (!process.env.HUGGINGFACE_ENDPOINT_URL) {
      throw new Error('Missing HUGGINGFACE_ENDPOINT_URL environment variable');
    }
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('Missing HUGGINGFACE_API_KEY environment variable');
    }

    // Create the natural text model with middleware
    console.log('[DEBUG] Creating natural text model...');
    const naturalModel = await createNaturalTextModel();
    console.log('[DEBUG] Natural text model created, calling streamText...');

    const result = streamText({
      model: naturalModel,
      messages: convertToModelMessages(messages),
    });
    console.log('[DEBUG] streamText result created');

    // Debug: Force stream consumption by manually reading from stream
    console.log('[DEBUG] Attempting to trigger middleware by accessing stream...');
    try {
      const textStream = result.textStream;
      console.log('[DEBUG] textStream accessed');
      
      // Try to trigger the stream by getting the reader
      const reader = textStream.getReader();
      console.log('[DEBUG] Reader obtained, this should trigger wrapStream');
      reader.releaseLock();
    } catch (e) {
      console.log('[DEBUG] Error accessing stream:', e);
    }

    // Debug: Test if the stream is being consumed properly
    console.log('[DEBUG] About to convert to stream response...');
    const response = result.toTextStreamResponse();
    console.log('[DEBUG] Stream response created, returning...');
    
    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}