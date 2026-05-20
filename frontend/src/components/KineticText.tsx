'use client';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

interface Props {
  text: string;
  effect?: string;
  className?: string;
  style?: CSSProperties;
}

const SYMBOLS = '!<>-_\\/[]{}—=+*^?#_';

export default function KineticText({ text, effect, className = '', style = {} }: Props) {
  const [displayText, setDisplayText] = useState(text);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (effect === 'Kinetic: Matrix Scrambler') {
      let iteration = 0;
      const interval = setInterval(() => {
        setDisplayText(
          text.split('').map((char, index) => {
            if (index < iteration) return text[index];
            return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          }).join('')
        );
        if (iteration >= text.length) clearInterval(interval);
        iteration += 1 / 3;
      }, 30);
      return () => clearInterval(interval);
    } else {
      setDisplayText(text);
    }
  }, [text, effect]);

  if (!mounted) return <span className={className} style={style}>{text}</span>;

  if (effect === 'Kinetic: Sine Wave') {
    return (
      <span className={`${`kinetic-wrapper ${className}`} inline-flex`} style={{ ...style }}>
        {text.split('').map((char, i) => (
          <span key={i} className="kinetic-char-wave" style={{ animationDelay: `${i * 0.05}s` }}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    );
  }

  if (effect === 'Kinetic: Elastic Band') {
    return <span className={`kinetic-elastic ${className}`} style={style}>{text}</span>;
  }

  if (effect === 'Kinetic: Ghost Shift') {
    return <span className={`kinetic-ghost ${className}`} data-text={text} style={style}>{text}</span>;
  }

  if (effect === 'Kinetic: Typewriter') {
    return (
      <span
        className={`kinetic-typewriter ${className}`}
        style={{ ...style, '--chars': text.length } as CSSProperties}
      >
        {text}
      </span>
    );
  }

  if (effect === 'Kinetic: Matrix Scrambler') {
    return <span className={`kinetic-matrix ${className}`} style={style}>{displayText}</span>;
  }

  // Named effect classes (effect-flying, effect-neon, etc.)
  if (effect && effect.startsWith('effect-')) {
    return <span className={`${effect} ${className}`} style={style}>{text}</span>;
  }

  return <span className={className} style={style}>{displayText}</span>;
}
