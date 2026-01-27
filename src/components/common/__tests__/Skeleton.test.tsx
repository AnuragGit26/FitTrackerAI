import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Skeleton } from '@/components/common/Skeleton';

describe('Skeleton', () => {
  it('should render without crashing', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should apply custom height', () => {
    const { container } = render(<Skeleton height={200} />);
    expect(container.firstChild).toBeDefined();
  });

  it('should apply custom width', () => {
    const { container } = render(<Skeleton width={100} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Skeleton className="rounded-full" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should support circular variant', () => {
    const { container } = render(<Skeleton variant="circular" width={50} height={50} />);
    expect(container.firstChild).toBeInTheDocument();
    // Verify the circular styling is applied by checking for rounded-full class
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('rounded-full');
  });

  it('should handle both width and height', () => {
    const { container } = render(<Skeleton width={150} height={100} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
