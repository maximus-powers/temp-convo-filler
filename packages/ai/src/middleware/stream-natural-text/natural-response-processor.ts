import type { 
  LanguageModelV2StreamPart, 
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt
} from '@ai-sdk/provider';
import type { 
  StreamNaturalTextConfig, 
  ProcessingMetrics
} from './types';

/**
 * Core processor that handles streaming text transformation for faster and more natural streams.
 * Implements concurrent dual-stream processing:
 * 1. SmolLM starts responding immediately to user input
 * 2. Large model generates thoughts in background with [bt] and [et] markers
 * 3. As thoughts arrive, SmolLM incorporates them into ongoing response
 */
export class NaturalResponseProcessor {
  private config: StreamNaturalTextConfig;
  private thoughts: string[] = [];
  private responses: string[] = [];
  private currentUserInput: string = '';
  private startTime: number = 0;
  private firstResponseTime: number = 0;
  private thoughtsProcessedCount: number = 0;

  constructor(config: StreamNaturalTextConfig) {
    this.config = config;
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG] 🔄 NaturalResponseProcessor constructor called at ${timestamp}`);
    
    // Try to signal through the callback that we're running
    if (config.onMetricsUpdate) {
      config.onMetricsUpdate({
        thoughtsExtracted: 0,
        thoughtsProcessed: 0,
        responsesGenerated: 0,
        processingTimeMs: 0,
        firstResponseTimeMs: 0,
        thoughts: ['CONSTRUCTOR_CALLED'],
        fullText: `Constructor called at ${timestamp}`
      });
    }
  }

  /**
   * Process with concurrent stream: SmolLM responds immediately while LLM generates thoughts.
   * @param primaryStream The original stream from the language model
   * @param params The call parameters (properly typed)
   * @returns A new stream with SmolLM's natural responses
   */
  processStream(
    primaryStream: ReadableStream<LanguageModelV2StreamPart>,
    params: LanguageModelV2CallOptions
  ): ReadableStream<LanguageModelV2StreamPart> {
    console.log('[DEBUG] processStream called!');
    return new ReadableStream({
      start: async (controller) => {
        console.log('[DEBUG] ReadableStream start called!');
        try {
          this.reset();
          this.extractUserInput(params);
          this.startTime = Date.now();
          
          // Provide immediate response for perceived speed (< 2 seconds requirement)
          await this.emitImmediateResponse(controller);
          
          await this.startConcurrentProcessing(primaryStream, controller, params);
          
          // Send final metrics
          console.log('[DEBUG] About to send final metrics');
          this.sendMetrics();
          console.log('[DEBUG] Final metrics sent');
        } catch (error) {
          console.error('[DEBUG] Error in processStream start:', error);
          this.sendMetrics(); // Send metrics even on error
          throw error;
        }
      }
    });
  }

  /**
   * Emit immediate response to meet < 2 second requirement for first chunk.
   * @private
   */
  private async emitImmediateResponse(controller: ReadableStreamDefaultController<LanguageModelV2StreamPart>): Promise<void> {
    // Generate immediate response based on user input using SmolLM
    const immediatePrompt = `<|im_start|>user\n${this.currentUserInput}<|im_end|>\n<|im_start|>assistant\n`;
    
    try {
      const immediateResponse = await this.callSmolLMForSentence(immediatePrompt);
      
      if (immediateResponse && immediateResponse.trim()) {
        // Record first response time
        if (this.firstResponseTime === 0) {
          this.firstResponseTime = Date.now() - this.startTime;
        }
        
        // Stream the immediate response word by word
        await this.streamSentenceTokens(immediateResponse, controller, 1);
      }
    } catch (error) {
      console.warn('Immediate response generation failed, using fallback:', error);
      // Fallback to simple acknowledgment
      if (this.firstResponseTime === 0) {
        this.firstResponseTime = Date.now() - this.startTime;
      }
      controller.enqueue({
        type: 'text-delta',
        id: '1',
        delta: "Let me think about that... "
      });
    }
  }

  /**
   * Extract user input from middleware params using proper SDK patterns.
   * @private
   */
  private extractUserInput(params: LanguageModelV2CallOptions): void {
    // Access the standardized prompt directly
    const prompt: LanguageModelV2Prompt = params.prompt;
    
    // Find the last user message using SDK pattern
    const lastUserMessage = [...prompt].reverse().find(message => message.role === 'user');
    
    if (lastUserMessage) {
      // Extract text from the user message content using proper types
      this.currentUserInput = lastUserMessage.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join(' ');
    } else {
      this.currentUserInput = 'User question';
    }
    
    // console.log(`[DEBUG] Extracted user input: "${this.currentUserInput}"`);
  }


  /**
   * True concurrent processing: SmolLM responds immediately while GPT-4 generates thoughts in parallel.
   * @private
   */
  private async startConcurrentProcessing(
    primaryStream: ReadableStream<LanguageModelV2StreamPart>,
    controller: ReadableStreamDefaultController<LanguageModelV2StreamPart>,
    params: LanguageModelV2CallOptions
  ): Promise<void> {
    
    // Start GPT-4 thought consumption in background immediately (don't await)
    this.consumeGPT4Thoughts(primaryStream).catch(err => {
      console.warn('GPT-4 thought processing failed:', err);
    });
    
    // Start SmolLM generation immediately (this will run and complete first)
    await this.runSmolLMGeneration(controller, params);
    
    const fullSmolLMText = this.responses.join(' ');
    // Log immediately when SmolLM generation is complete
    console.log(`🤖 [SMOL-LM COMPLETE] Full generated text:`, fullSmolLMText);
    
    controller.close();
  }
  
  /**
   * SmolLM generation process: waits for thoughts like Python implementation.
   * @private
   */
  private async runSmolLMGeneration(
    controller: ReadableStreamDefaultController<LanguageModelV2StreamPart>,
    params: LanguageModelV2CallOptions
  ): Promise<void> {
    let textId = 1;
    let lastThoughtCount = 0;
    let waitCount = 0;
    
    console.log('[DEBUG] SmolLM generation starting, waiting for thoughts...');
    
    // Wait for thoughts and generate responses - with generous timeout since we have immediate response
    while (waitCount < 100) { // Longer timeout since we provide immediate response
      
      // Wait for a new thought to arrive
      if (this.thoughts.length > lastThoughtCount) {
        console.log(`[DEBUG] New thought available! Total: ${this.thoughts.length}, Last processed: ${lastThoughtCount}`);
        // Track thought processing
        this.thoughtsProcessedCount++;
        
        // We have a new thought - generate a response for it
        const response = await this.generateResponseForLatestThought();
        console.log(`[DEBUG] Generated SmolLM response: "${response}"`);
        
        if (response && response.trim()) {
          // Stream the response word by word
          await this.streamSentenceTokens(response, controller, textId++);
          
          // Store response in dialogue state
          this.responses.push(response);
          lastThoughtCount = this.thoughts.length;
          waitCount = 0; // Reset wait counter
        }
        
      } else {
        // No new thought yet, wait a bit
        waitCount++;
        await this.delay(100); // Shorter delay for more responsive processing
      }
      
      // Stop if we've processed enough thoughts or reached reasonable length
      if (this.responses.length >= 5 || this.shouldStopGeneration()) {
        // console.log(`[DEBUG] Stopping generation. Responses: ${this.responses.length}`);
        break;
      }
    }
    
    // No fallback response needed since we have immediate response
  }
  
  /**
   * GPT-4 thought consumption process: runs in parallel, adding thoughts to queue.
   * @private
   */
  private async consumeGPT4Thoughts(
    primaryStream: ReadableStream<LanguageModelV2StreamPart>
  ): Promise<void> {
    const reader = primaryStream.getReader();
    let buffer = '';
    let chunkCount = 0;
    
    console.log('[DEBUG] GPT-4 thought consumption starting...');
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // console.log('[DEBUG] GPT-4 stream finished');
          // console.log(`[DEBUG] Final buffer content: "${buffer}"`);
          break;
        }
        
        if (value.type === 'text-delta') {
          const chunk = value.delta;
          chunkCount++;
          buffer += chunk;
          
          console.log(`[DEBUG] Chunk #${chunkCount}: "${chunk}"`);
          console.log(`[DEBUG] Buffer now: "${buffer.substring(Math.max(0, buffer.length - 100))}..."`);
          
          // Extract complete thoughts from buffer
          while (buffer.includes('[bt]') && buffer.includes('[et]')) {
            const btIndex = buffer.indexOf('[bt]');
            const etIndex = buffer.indexOf('[et]', btIndex);
            
            if (btIndex !== -1 && etIndex !== -1) {
              // Extract the thought content (without markers)
              const thoughtContent = buffer.substring(btIndex + 4, etIndex).trim();
              
              console.log(`[DEBUG] Found complete thought: "${thoughtContent}"`);
              
              if (thoughtContent) {
                this.thoughts.push(thoughtContent);
                console.log(`[DEBUG] Total thoughts so far: ${this.thoughts.length}`);
              }
              
              // Remove processed thought from buffer
              buffer = buffer.substring(etIndex + 4);
              // console.log(`[DEBUG] Buffer after processing: "${buffer.substring(0, 50)}..."`);
            }
          }
        }
      }
      
      // Log immediately when thoughts are complete
      console.log(`🧠 [GPT-4 THOUGHTS] Complete list:`, this.thoughts);
      
    } finally {
      reader.releaseLock();
    }
  }
  
  /**
   * Generate response for the latest thought using Python's construct_prompt logic.
   * @private
   */
  private async generateResponseForLatestThought(): Promise<string> {
    try {
      // Build prompt exactly like Python construct_prompt()
      let prompt = `<|im_start|>user\n${this.currentUserInput}<|im_end|>\n`;
      
      if (this.responses.length === 0) {
        // First response - use the first thought (like Python line 76)
        prompt += `<|im_start|>knowledge\n${this.thoughts[0]}<|im_end|>\n`;
      } else {
        // Build conversation history with thought-response pairs (like Python lines 80-82)
        const numResponses = this.responses.length;
        for (let i = 0; i < numResponses; i++) {
          prompt += `<|im_start|>knowledge\n${this.thoughts[i]}<|im_end|>\n`;
          prompt += `<|im_start|>assistant\n${this.responses[i]}<|im_end|>\n`;
        }
        // Add the new thought (like Python line 82)
        if (this.thoughts.length > numResponses) {
          prompt += `<|im_start|>knowledge\n${this.thoughts[numResponses]}<|im_end|>\n`;
        }
      }
      
      prompt += `<|im_start|>assistant\n`;
      
      // console.log(`[DEBUG] SmolLM Prompt for response #${this.responses.length + 1}:`);
      // console.log('='.repeat(60));
      // console.log(prompt);
      // console.log('='.repeat(60));
      
      // Generate response from SmolLM
      const response = await this.callSmolLMForSentence(prompt);
      
      return response;
      
    } catch (error) {
      console.warn('SmolLM response generation failed:', error);
      return ''; // Return empty to skip this response
    }
  }
  
  /**
   * Generate a response from SmolLM based on a thought (like Python small_model_fn).
   * @private
   */
  private async callSmolLMForSentence(prompt: string): Promise<string> {
    const messages = [{ role: 'user' as const, content: prompt }];
    
    const requestBody = {
      model: 'tgi',
      messages: messages,
      max_tokens: 50, // Longer for complete thoughts
      temperature: this.config.temperature || 0.7,
      stream: false
    };
    
    const tgiUrl = this.config.huggingfaceEndpointUrl.endsWith('/v1/chat/completions')
      ? this.config.huggingfaceEndpointUrl
      : `${this.config.huggingfaceEndpointUrl}/v1/chat/completions`;
    
    const response = await fetch(tgiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.huggingfaceApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`SmolLM API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    // Clean up response like Python implementation - remove all artifacts
    return content
      .replace(/<\|im_start\|>/g, '')
      .replace(/<\|im_end\|>/g, '')
      .replace(/^assistant\s*/i, '')
      .replace(/\bassistant\b/gi, '')
      .replace(/\bknowledge\b/gi, '')
      .replace(/^\s*knowledge\s*/i, '')
      .replace(/^\s*assistant\s*/i, '')
      .trim();
  }
  
  /**
   * Stream a sentence word by word for natural appearance.
   * @private
   */
  private async streamSentenceTokens(
    sentence: string,
    controller: ReadableStreamDefaultController<LanguageModelV2StreamPart>,
    textId: number
  ): Promise<void> {
    if (!sentence || sentence.trim() === '') return;
    
    const words = sentence.split(' ').filter(w => w.trim());
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      
      if (controller.desiredSize !== null) {
        controller.enqueue({
          type: 'text-delta',
          id: String(textId),
          delta: word
        });
      }
      
      // Very small delay between words for natural flow
      await this.delay(30);
    }
    
    // Add space after sentence
    if (controller.desiredSize !== null) {
      controller.enqueue({
        type: 'text-delta',
        id: String(textId + 1000),
        delta: ' '
      });
    }
  }
  
  /**
   * Check if SmolLM should stop generating more sentences.
   * @private
   */
  private shouldStopGeneration(): boolean {
    // Stop if we've generated a reasonable response length
    const totalLength = this.responses.join(' ').length;
    return totalLength > 500; // Stop after ~500 characters
  }


  /**
   * Simple delay utility.
   * @param ms Milliseconds to delay
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  /**
   * Send metrics callback if configured.
   * @private
   */
  private sendMetrics(): void {
    if (this.config.onMetricsUpdate) {
      const fullSmolLMText = this.responses.join(' ');
      const metrics: ProcessingMetrics & { thoughts: string[], fullText: string } = {
        thoughtsExtracted: this.thoughts.length,
        thoughtsProcessed: this.thoughtsProcessedCount,
        responsesGenerated: this.responses.length,
        processingTimeMs: Date.now() - this.startTime,
        firstResponseTimeMs: this.firstResponseTime,
        thoughts: this.thoughts,
        fullText: fullSmolLMText
      };
      
      console.log('[DEBUG] About to send metrics with thoughts:', this.thoughts.length, 'and responses:', this.responses.length);
      console.log('[DEBUG] Actual thoughts array:', this.thoughts);
      console.log('[DEBUG] Actual responses array:', this.responses);
      this.config.onMetricsUpdate(metrics);
    }
  }

  /**
   * Reset dialogue state for a new conversation turn.
   * @private
   */
  private reset(): void {
    console.log('[DEBUG] 🔄 Reset called - clearing thoughts and responses');
    this.thoughts = [];
    this.responses = [];
    this.currentUserInput = '';
    this.startTime = 0;
    this.firstResponseTime = 0;
    this.thoughtsProcessedCount = 0;
  }
}