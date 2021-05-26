import { Constructor } from '../typings';
import { Repository } from '../repository';
import { Type } from '../types';

/**
 * Definitions provide the metadata classes with the data to
 * properly construct them.
 */

export interface DocumentDefinition<T = any> {
  DocumentClass: Constructor<T>;
  repository: () => Constructor<Repository<T>>;
  database?: string;
  collection: string;
  extensions?: Record<any, any>;
}

export interface FieldDefinition<T = any> {
  DocumentClass: Constructor<T>;
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
  DocumentClass: Constructor<T>;
  propertyName: string;
}

export interface DiscriminatorDefinition<T = any> {
  DocumentClass: Constructor<T>;
  isMapped?: boolean;
  propertyName?: string;
  fieldName?: string;
  map: Record<string, () => Constructor>;
}
