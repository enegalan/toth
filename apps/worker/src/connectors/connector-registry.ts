import type { ConnectorType, SourceConnector } from '@toth/shared';
import { EpublibreConnector } from './epublibre.connector';
import { EpubbooksConnector } from './epubbooks.connector';
import { EpubGratisConnector } from './epub-gratis.connector';
import { GutenbergConnector } from './gutenberg.connector';
import { OpenLibraryConnector } from './open-library.connector';
import { StandardEbooksConnector } from './standard-ebooks.connector';

import { CONNECTOR_TYPES as CONNECTOR_TYPE_LIST } from '@toth/shared';

const CONNECTOR_IMPLEMENTATIONS: Record<ConnectorType, new (sourceId: string) => SourceConnector> = {
  gutenberg: GutenbergConnector,
  standard_ebooks: StandardEbooksConnector,
  open_library: OpenLibraryConnector,
  epub_gratis: EpubGratisConnector,
  epublibre: EpublibreConnector,
  epubbooks: EpubbooksConnector,
};

export function createConnector(type: ConnectorType, sourceId: string): SourceConnector {
  const Ctor = CONNECTOR_IMPLEMENTATIONS[type];
  if (!Ctor) throw new Error(`Unknown connector type: ${type}`);
  return new Ctor(sourceId);
}

export function getConnectorTypes(): ConnectorType[] {
  return [...CONNECTOR_TYPE_LIST];
}
