import React from 'react';
import { cn } from '@workspace/ui/lib/utils';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function Message({ role, content, isStreaming }: MessageProps) {
  return (
    <div
      className={cn(
        'flex w-full mb-4',
        role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2 text-sm',
          role === 'user'
            ? 'bg-primary text-primary-foreground ml-4'
            : 'bg-muted text-muted-foreground mr-4'
        )}
      >
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium">
            {role === 'user' ? '👤' : '🤖'}
          </div>
          <div className="flex-1">
            <div className="whitespace-pre-wrap break-words">
              {content}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}