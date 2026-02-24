export interface Author {
  id: string;
  canonical_name: string;
  aliases: string[];
  birth_year: number | null;
  death_year: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Work {
  id: string;
  canonical_title: string;
  author_id: string;
  language: string;
  description: string | null;
  subjects: string[];
  popularity_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface Edition {
  id: string;
  work_id: string;
  source_id: string;
  license: string;
  file_size: number | null;
  download_url: string;
  cover_url: string | null;
  quality_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface Source {
  id: string;
  name: string;
  base_url: string;
  trust_score: number;
  license_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface IngestionJob {
  id: string;
  source_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SearchFilters {
  language?: string;
  license?: string;
  author_id?: string;
  year?: number;
  source_id?: string;
  public_domain?: boolean;
  subject?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface RawEditionRecord {
  source_id: string;
  external_id: string;
  title: string;
  authors: string[];
  language: string;
  description: string | null;
  subjects: string[];
  license: string;
  download_url: string;
  file_size: number | null;
  published_date: string | null;
  cover_url: string | null;
}

export interface SourceConnector {
  readonly sourceId: string;
  fetchCatalog(): AsyncGenerator<RawEditionRecord, void, unknown>;
  healthCheck(): Promise<boolean>;
}

export interface WorkSearchDocument {
  id: string;
  canonical_title: string;
  author_name: string;
  author_id: string;
  language: string;
  description: string | null;
  subjects: string[];
  licenses: string[];
  source_ids: string[];
  cover_url: string | null;
  popularity_score: number;
  updated_at: number;
}
