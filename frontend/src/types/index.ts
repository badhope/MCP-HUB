export interface Server {
  name: string;
  full_name: string;
  source: string;
  description: string;
  source_type: string;
  categories: string[];
  language: string;
  stars: number;
  owner: string;
  topics: string[];
  updated_at: string;
  created_at: string;
  archived: boolean;
  license?: string;
}

export interface MCPServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ServerConfig {
  name: string;
  mcpServers?: Record<string, MCPServerEntry>;
  commands?: Record<string, string[]>;
  docker?: {
    image?: string;
    args?: string[];
    env?: Record<string, string>;
  };
  snippets?: Record<string, string>;
  install?: {
    npm?: string;
    pip?: string;
    apt?: string;
    brew?: string;
    cargo?: string;
    git?: string;
    docker?: string;
  };
}

export interface ServerListResponse {
  total: number;
  servers: Server[];
}

export interface StatsResponse {
  total_servers: number;
  total_categories: number;
  last_sync: string;
  source_types: Record<string, number>;
  categories: Record<string, number>;
}
