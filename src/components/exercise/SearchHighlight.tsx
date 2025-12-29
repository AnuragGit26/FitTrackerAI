import { findMatches } from '@/utils/exerciseSearch';

interface SearchHighlightProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Component that highlights matching search terms in text
 */
export function SearchHighlight({
  text,
  query,
  className = '',
  highlightClassName = '',
}: SearchHighlightProps) {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const matches = findMatches(text, query);

  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Merge overlapping matches
  const mergedMatches: Array<{ start: number; end: number }> = [];
  for (const match of matches) {
    if (mergedMatches.length === 0) {
      mergedMatches.push(match);
    } else {
      const last = mergedMatches[mergedMatches.length - 1];
      if (match.start <= last.end) {
        // Merge overlapping matches
        last.end = Math.max(last.end, match.end);
      } else {
        mergedMatches.push(match);
      }
    }
  }

  // Build highlighted text
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  for (const match of mergedMatches) {
    // Add text before match
    if (match.start > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.start),
        highlight: false,
      });
    }

    // Add highlighted match
    parts.push({
      text: text.substring(match.start, match.end),
      highlight: true,
    });

    lastIndex = match.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlight: false,
    });
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.highlight) {
          return (
            <mark
              key={index}
              className={highlightClassName || 'bg-primary/20 text-primary font-medium'}
            >
              {part.text}
            </mark>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </span>
  );
}

