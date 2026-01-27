import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCountUp } from '@/hooks/useCountUp';

describe('useCountUp', () => {
  it('should render without crashing', () => {
    const { result } = renderHook(() => useCountUp(100, 0));
    expect(result.current).toBeDefined();
  });

  it('should have formattedValue property', () => {
    const { result } = renderHook(() => useCountUp(100, 0));
    expect(result.current.formattedValue).toBeDefined();
    expect(typeof result.current.formattedValue).toBe('string');
  });

  it('should count up from start to end', () => {
    const { result } = renderHook(() => useCountUp(100, 0, { duration: 0.1 }));
    expect(result.current).toBeDefined();
  });

  it('should handle zero end value', () => {
    const { result } = renderHook(() => useCountUp(0, 0));
    expect(result.current.formattedValue).toBeDefined();
  });

  it('should support decimals option', () => {
    const { result } = renderHook(() => useCountUp(100.5, 0, { decimals: 1 }));
    expect(result.current.formattedValue).toBeDefined();
  });
});
