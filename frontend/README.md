# MCP Hub Frontend

> Modern React + TypeScript frontend for MCP Hub

## Overview

MCP Hub Frontend is a beautiful, responsive web interface built with React 18, TypeScript, Tailwind CSS, and Vite. It provides an intuitive way to discover, browse, and explore MCP (Model Context Protocol) servers.

## Features

- **Modern UI** - Beautiful gradient design with glass morphism effects
- **Responsive** - Works perfectly on desktop, tablet, and mobile
- **Fast Performance** - Built with React 18 and Vite for instant updates
- **Type Safe** - Full TypeScript support
- **Dark Mode Ready** - Follows Tailwind design system

## Tech Stack

- React 18 - UI library
- TypeScript - Type safety
- Tailwind CSS - Styling
- Vite - Build tool
- Zustand - State management
- React Router - Routing
- Lucide React - Icons

## Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── layout/     # Layout components (Navbar, Footer)
│   │   ├── server/      # Server-related components
│   │   ├── shared/      # Shared UI components
│   │   └── ui/          # Base UI components
│   ├── pages/           # Page components
│   │   ├── Home.tsx     # Home page
│   │   ├── ServerList.tsx    # Server listing
│   │   ├── ServerDetail.tsx  # Server detail
│   │   ├── Categories.tsx    # Categories page
│   │   ├── Curated.tsx       # Curated servers
│   │   └── Companies.tsx     # Companies page
│   ├── store/           # Zustand stores
│   ├── lib/             # Utilities
│   ├── types/           # TypeScript types
│   └── data/            # Static data
├── public/              # Static assets
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/badhope/mcp-hub.git
cd mcp-hub/frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Development

```bash
# Start development server
npm run dev

# Access at http://localhost:5173
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# API URL (default: backend server)
VITE_API_URL=http://localhost:8080

# App configuration
VITE_APP_NAME=MCP Hub
VITE_APP_VERSION=2.0.0
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page with stats and featured servers |
| Servers | `/servers` | Browse all servers with filtering |
| Server Detail | `/servers/:name` | Detailed server information |
| Categories | `/categories` | Browse by categories |
| Curated | `/curated` | Hand-picked quality servers |
| Companies | `/companies` | Servers by tech companies |

## Components

### Layout
- **Navbar** - Top navigation with search and links
- **Footer** - Bottom footer with links and info

### Server Components
- **ServerCard** - Server preview card
- **ServerGrid** - Grid layout for server cards

### Shared Components
- **SearchBar** - Search input with icon
- **FilterBar** - Filters for category, language, stars
- **Pagination** - Page navigation
- **StatsCard** - Statistics display card
- **Skeleton** - Loading placeholder

### UI Components
- **Button** - Button component with variants
- **Badge** - Badge component
- **Card** - Card component

## API Integration

The frontend integrates with the FastAPI backend via REST API:

```typescript
import { apiClient } from './lib/api';

// Get servers
const servers = await apiClient.getServers({ limit: 20 });

// Get single server
const server = await apiClient.getServer('github-mcp-server');

// Get stats
const stats = await apiClient.getStats();
```

### Available API Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getHealth` | `GET /` | API health check |
| `getStats` | `GET /stats` | Market statistics |
| `getServers` | `GET /servers` | List servers with filters |
| `getPopularServers` | `GET /servers/popular` | Top servers by stars |
| `getRecentServers` | `GET /servers/recent` | Recently updated |
| `getCuratedServers` | `GET /servers/curated` | Curated selection |
| `getServer` | `GET /servers/:name` | Single server details |
| `getServerConfig` | `GET /config/:name` | Server configuration |

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t mcp-hub-frontend .

# Run container
docker run -p 5173:80 mcp-hub-frontend
```

Or use Docker Compose (see root directory):

```bash
docker-compose up --build
```

## License

MIT License - See [LICENSE](../LICENSE) in root directory
