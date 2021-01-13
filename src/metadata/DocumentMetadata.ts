import { Collection, Db } from 'mongodb';
import { DocumentClass } from '../typings';
import {
  AbstractDocumentMetadata,
  FieldsMetadata
} from './AbstractDocumentMetadata';
import { FieldMetadata } from './FieldMetadata';
import { Connection } from '../connection/Connection';
import { Repository } from '../repository/Repository';

export interface DocumentMetadataOpts<T = any> {
  DocumentClass: DocumentClass<T>;
  fields: FieldsMetadata;
  connection: Connection;
  db: Db;
  collection: Collection<T>;
  repository: Repository<T>;
  extensions?: Record<any, any>;
}

/**
 * DocumentMetadata contains all the needed info for Document classes.
 */
export class DocumentMetadata<T = any> extends AbstractDocumentMetadata<
  T,
  DocumentClass
> {
  public readonly connection: Connection;
  public readonly db: Db;
  public readonly collection: Collection;
  public readonly extensions: Record<any, any>;
  public readonly repository: Repository<T>;
  public readonly idField: FieldMetadata;

  constructor(opts: DocumentMetadataOpts<T>) {
    super(opts.DocumentClass, opts.fields);
    this.connection = opts.connection;
    this.db = opts.db;
    this.collection = opts.collection;
    this.extensions = opts.extensions || {};
    this.repository = opts.repository;
    this.repository.metadata = this;

    if (!opts.fields.has('_id')) {
      throw new Error(`@Document() class is missing an "_id" @Field()!`);
    }
    this.idField = opts.fields.get('_id');
  }

  isRoot(): boolean {
    return true;
  }

  /**
   * Creates the document _id.
   */
  id<T1 = any, T2 = any>(id?: T1): T2 {
    return this.idField.init(id);
  }

  /**
   * Checks if given id is a valid one.
   */
  isValidId(id?: any): boolean {
    return this.idField.type.isValidJSValue(id);
  }

  /**
   * Creates the document _id.
   */
  hasId(): boolean {
    return this.fields.has('_id');
  }
}
