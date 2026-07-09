'use client';

import { TextareaHTMLAttributes, useLayoutEffect, useRef } from 'react';

// Automatikusan a tartalomhoz növő textarea: nincs belső görgetés,
// így a modálban csak egyetlen görgető felület marad (a modál törzse).
type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number };

export default function GrowArea({ minRows = 3, value, className, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={`ta-grow${className ? ` ${className}` : ''}`}
      {...rest}
    />
  );
}
