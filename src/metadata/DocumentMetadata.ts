import { Collection, Db } from 'mongodb';
import { Newable } from '../typings';
import {
  AbstractDocumentMetadata,
  FieldsMetadata
} from './AbstractDocumentMetadata';
import { Connection } from '../connection/Connection';
import { Repository } from '../repository';
import { DocumentManager } from '../DocumentManager';

export interface DocumentMetadataOpts<T = any, D extends Newable = Newable<T>> {
  DocumentClass: D;
  manager: DocumentManager;
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
export class DocumentMetadata<
  T = any,
  D extends Newable = Newable<T>
> extends AbstractDocumentMetadata<T, D> {
  public readonly manager: DocumentManager;
  public readonly connection: Connection;
  public readonly db: Db;
  public readonly collection: Collection<T>;
  public readonly extensions: Record<any, any>;
  public readonly repository: Repository<T>;

  constructor(opts: DocumentMetadataOpts<T, D>) {
    super(opts.manager, opts.DocumentClass, opts.fields);
    this.connection = opts.connection;
    this.db = opts.db;
    this.collection = opts.collection;
    this.extensions = opts.extensions || {};
    this.repository = opts.repository;
    this.repository.manager = this.manager;
    this.repository.metadata = this;
  }

  isRoot(): boolean {
    return true;
  }
}
