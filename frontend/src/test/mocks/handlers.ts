import { http, HttpResponse } from 'msw';

const mockServer = {
  name: 'test-server',
  owner: 'test-owner',
  description: 'A test server for unit testing',
  stars: 100,
  updated_at: '2024-01-15T00:00:00Z',
  source: 'https://github.com/test-owner/test-server',
  source_type: 'official',
  archived: false,
  language: 'TypeScript',
  license: 'MIT',
  categories: ['ai', 'tools'],
  topics: ['testing', 'mcp'],
};

export const handlers = [
  http.get('/api/servers', () => {
    return HttpResponse.json({
      servers: [mockServer],
      total: 1,
    });
  }),

  http.get('/api/servers/:name', ({ params }) => {
    return HttpResponse.json({
      ...mockServer,
      name: params.name || mockServer.name,
    });
  }),

  http.get('/api/servers/curated', () => {
    return HttpResponse.json({
      servers: [mockServer],
      total: 1,
    });
  }),

  http.get('/api/servers/popular', () => {
    return HttpResponse.json({
      servers: [mockServer],
      total: 1,
    });
  }),

  http.get('/api/stats', () => {
    return HttpResponse.json({
      total_servers: 1,
      official_count: 1,
      categories: ['ai'],
      languages: ['TypeScript'],
    });
  }),

  http.get('/api/favorites/:userId', () => {
    return HttpResponse.json({
      favorites: ['test-server'],
    });
  }),

  http.post('/api/favorites/add', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/favorites/remove', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/ratings/:serverName', () => {
    return HttpResponse.json({
      ratings: [{ rating: 4, comment: 'Great server' }],
      average: 4.0,
      total: 1,
    });
  }),
];