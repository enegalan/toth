export const SUPPORTED_LICENSES = [
  'public-domain',
  'cc0',
  'cc-by',
  'cc-by-sa',
  'cc-by-nc',
  'cc-by-nc-sa',
  'pd',
  'gutenberg',
] as const;

export type SupportedLicense = (typeof SUPPORTED_LICENSES)[number];

export const CONNECTOR_TYPES = [
  'gutenberg',
  'standard_ebooks',
  'open_library',
  'epub_gratis',
  'epublibre',
  'epubbooks',
] as const;

export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
