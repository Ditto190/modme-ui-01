'use client';

import { useEffect, useState } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * Renders assistant text with a subtle reveal while tokens stream in.
 * Respects prefers-reduced-motion by showing full text immediately.
 */
export function StreamingText({
  text,
  isStreaming = false,
  className = '',
}: StreamingTextProps) {
  const [visibleLength, setVisibleLength] = useState(text.length);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion || !isStreaming) {
      setVisibleLength(text.length);
      return;
    }

    setVisibleLength((current) => {
      if (text.length <= current) {
        return text.length;
      }
      return Math.min(current + 2, text.length);
    });
  }, [text, isStreaming, reducedMotion]);

  const display = text.slice(0, visibleLength);

  return (
    <p className={`streaming-text font-medium leading-relaxed ${className}`}>
      {display}
      {isStreaming && !reducedMotion && (
        <span className="streaming-cursor ml-0.5 inline-block w-2 animate-pulse bg-cyan-300/80">
          &nbsp;
        </span>
      )}
    </p>
  );
}
