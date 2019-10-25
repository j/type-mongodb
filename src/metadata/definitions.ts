import { DocumentClass, Newable } from '../types';
import { Repository } from '../repository/Repository';

/**
 * Definitions provide the metadata classes with the data to
 * properly construct them.
 */

export interface DocumentDefinition<T = any> {
  DocumentClass: DocumentClass<T>;
  RepositoryClass: Newable<Repository<T>>;
  database?: string;
  collection: string;
  extensions?: Record<any, any>;
}

export interface FieldDefinition<T = any> {
  DocumentClass: DocumentClass<T>;
  fieldName: string;
  isEmbedded: boolean;
  embedded?: () => any;
  extensions?: Record<any, any>;
}
