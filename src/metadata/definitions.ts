import { DocumentClass, Newable } from '../typings';
import { Repository } from '../repository/Repository';
import { Type } from '../types';

/**
 * Definitions provide the metadata classes with the data to
 * properly construct them.
 */

export interface DocumentDefinition<T = any> {
  DocumentClass: DocumentClass<T>;
  repository: () => Newable<Repository<T>>;
  database?: string;
  collection: string;
  extensions?: Record<any, any>;
}

export interface FieldDefinition<T = any> {
  DocumentClass: DocumentClass<T>;
  type: Type;
  typeIsArray: boolean;
  propertyName: string;
  fieldName: string;
  isEmbedded: boolean;
  embedded?: () => any;
  extensions?: Record<any, any>;
  isId: boolean;
  shouldCreateJSValue: boolean;
}

export interface ParentDefinition<T = any> {
  DocumentClass: DocumentClass<T>;
  propertyName: string;
}

export interface DiscriminatorDefinition<T = any> {
  DocumentClass: DocumentClass<T>;
  isMapped?: boolean;
  propertyName?: string;
  fieldName?: string;
  map: { [type: string]: () => Newable };
}
