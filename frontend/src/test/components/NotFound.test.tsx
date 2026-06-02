import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NotFound from '../../pages/NotFound';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>
  );
}

describe('NotFound', () => {
  it('renders 404 heading', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders page not found message', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders go home link', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('renders search servers link', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('Browse Servers')).toBeInTheDocument();
  });
});