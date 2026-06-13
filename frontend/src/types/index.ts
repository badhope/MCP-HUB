export interface InstallHint {
  primary: string;
  alternatives: {
    npm: string | null;
    pip: string | null;
    git: string | null;
    docker: string | null;
  };
  zip_url: string | null;
}

export interface ScoreBreakdown {
  stars: number;
  recency: number;
  lang_coverage: number;
  desc_quality: number;
  our_signal: number;
}

export interface Server {
  name: string;
  full_name?: string;
  source: string;
  description: string;
  source_type: string;
  categories: string[];
  language: string;
  stars: number;
  owner?: string;
  topics?: string[];
  updated_at: string;
  created_at?: string;
  archived?: boolean;
  license?: string;
  /** Build-time fields (Phase 5 gen_static_data.py) */
  install_hint?: InstallHint;
  score?: number;
  score_breakdown?: ScoreBreakdown;
  our_signal?: number;
  our_signal_label?: string;
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
  // ISO-style date the static snapshot was generated. Surfaced next to
  // per-server metrics so the demo is clearly labelled as a snapshot,
  // not a live feed. FastAPI backend overwrites this on every scrape.
  data_snapshot_date: string;
  // Curated-sample source-types breakdown. The full registry does not have a
  // verified official/community split, so we surface this only for the
  // sample subset and annotate with sample_size.
  sample_source_types?: Record<string, number>;
  sample_size?: number;
  categories: Record<string, number>;
  /** Count of servers we have an adapter for (our_signal >= 0.7). Sourced
   *  from the build-time `our_tools_count` field in servers-index.json. */
  our_tools_count?: number;
  /** Map of language -> server count. Sourced from the build-time
   *  `languages` map in servers-index.json. */
  languages?: Record<string, number>;
  features?: string[];
}
