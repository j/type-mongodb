import { Collection, Db } from 'mongodb';
import { DocumentClass } from '../typings';
import {
  AbstractDocumentMetadata,
  FieldsMetadata
} from './AbstractDocumentMetadata';
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

  constructor(opts: DocumentMetadataOpts<T>) {
    super(opts.DocumentClass, opts.fields);
    this.connection = opts.connection;
    this.db = opts.db;
    this.collection = opts.collection;
    this.extensions = opts.extensions || {};
    this.repository = opts.repository;
    this.repository.metadata = this;
  }

  isRoot(): boolean {
    return true;
  }
}
