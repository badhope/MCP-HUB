import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Default to static-data mode for the apiClient in unit tests. The live
// API paths require MSW handlers, network mocks, or a real backend —
// none of which are available in the default jsdom environment. Tests
// that specifically need to exercise the live paths should clear this
// stub locally.
vi.stubEnv('VITE_USE_STATIC_DATA', 'true');
vi.stubEnv('VITE_API_URL', '');

afterEach(() => {
  cleanup();
});
