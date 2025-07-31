'use client';

import React from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { MessageList } from '@/components/ui/message-list';
import { ChatInput } from '@/components/ui/chat-input';

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/chat',
    }),
    onResponse: (response) => {
      console.log('Response received:', response.status);
    },
    onError: (error) => {
      console.log('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('🤖 [SMOL-LM COMPLETE] Full generated text:', message.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '');
    }
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">🤖</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">AI Chat Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Powered by GPT-4 with natural language processing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <span>⚠️</span>
            <span>Error: {error.message || 'Something went wrong. Please try again.'}</span>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">Debug Info</summary>
              <pre className="mt-1 text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput
          onSubmit={sendMessage}
          isLoading={isLoading}
          disabled={!!error}
        />
      </div>
    </div>
  );
}