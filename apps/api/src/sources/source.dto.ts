import { Source } from '@toth/database';

export class SourceDto {
  id: string;
  name: string;
  base_url: string;
  trust_score: number;
  license_type: string;
  legal_basis: string | null;

  static from(source: Source): SourceDto {
    return {
      id: source.id,
      name: source.name,
      base_url: source.base_url,
      trust_score: Number(source.trust_score),
      license_type: source.license_type,
      legal_basis: source.legal_basis ?? null,
    };
  }
}
