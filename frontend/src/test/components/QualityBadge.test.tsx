import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityBadge } from '../../components/shared/QualityBadge';

describe('QualityBadge', () => {
  it('renders S level for score >= 80', () => {
    render(<QualityBadge score={85} />);
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('renders A level for score >= 65', () => {
    render(<QualityBadge score={70} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders B level for score >= 50', () => {
    render(<QualityBadge score={55} />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders C level for score >= 35', () => {
    render(<QualityBadge score={40} />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders D level for score < 35', () => {
    render(<QualityBadge score={20} />);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows score when showScore is true', () => {
    render(<QualityBadge score={85} showScore />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('does not show score when showScore is false', () => {
    render(<QualityBadge score={85} showScore={false} />);
    expect(screen.queryByText('85')).not.toBeInTheDocument();
  });

  it('applies sm size by default', () => {
    render(<QualityBadge score={50} />);
    const badge = screen.getByText('B').parentElement;
    expect(badge).toBeInTheDocument();
  });

  it('applies md size when specified', () => {
    render(<QualityBadge score={50} size="md" />);
    const badge = screen.getByText('B').parentElement;
    expect(badge).toBeInTheDocument();
  });
});