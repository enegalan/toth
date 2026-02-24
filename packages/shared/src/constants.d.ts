export declare const SUPPORTED_LICENSES: readonly ["public-domain", "cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa", "pd", "gutenberg"];
export type SupportedLicense = (typeof SUPPORTED_LICENSES)[number];
export declare const CONNECTOR_TYPES: readonly ["gutenberg", "standard_ebooks", "open_library", "epub_gratis", "epublibre"];
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
