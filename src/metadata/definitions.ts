import { DocumentType, Newable } from '../common';
import { Repository } from 'src/repository/Repository';

/**
 * Definitions provide the metadata classes with the data to
 * properly construct them.
 */

export interface DocumentDefinition<T = any> {
  DocumentClass: DocumentType<T>;
  RepositoryClass: Newable<Repository<T>>;
  connection: string;
  database?: string;
  collection: string;
  extensions?: Record<any, any>;
}

export interface FieldDefinition<T = any> {
  DocumentClass: DocumentType<T>;
  fieldName: string;
  isEmbedded: boolean;
  embedded?: () => any;
  extensions?: Record<any, any>;
}
