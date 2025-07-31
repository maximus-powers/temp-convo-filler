import React, { useEffect, useRef } from 'react';
import { Message } from './message';
import type { Message as MessageType } from 'ai';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="text-4xl">💬</div>
          <h3 className="text-lg font-medium">Start a conversation</h3>
          <p className="text-sm">
            Ask me anything and I'll respond with thoughtful, natural responses
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollAreaRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
    >
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          content={
            message.parts
              ?.filter(part => part.type === 'text')
              ?.map(part => part.text || '')
              ?.join('') || ''
          }
          isStreaming={false}
        />
      ))}
      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <Message
          role="assistant"
          content=""
          isStreaming={true}
        />
      )}
    </div>
  );
}