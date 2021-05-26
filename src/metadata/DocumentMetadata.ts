import { Collection, Db, MongoClient } from 'mongodb';
import { Constructor } from '../typings';
import {
  AbstractDocumentMetadata,
  FieldsMetadata
} from './AbstractDocumentMetadata';
import { Repository } from '../repository';
import { DocumentManager } from '../DocumentManager';

export interface DocumentMetadataOpts<T> {
  DocumentClass: Constructor<T>;
  manager: DocumentManager;
  fields: FieldsMetadata;
  client: MongoClient;
  db: Db;
  collection: Collection<T>;
  repository: Repository<T>;
  extensions?: Record<any, any>;
}

/**
 * DocumentMetadata contains all the needed info for Document classes.
 */
export class DocumentMetadata<T = any> extends AbstractDocumentMetadata<T> {
  public readonly manager: DocumentManager;
  public readonly client: MongoClient;
  public readonly db: Db;
  public readonly collection: Collection<T>;
  public readonly extensions: Record<any, any>;
  public readonly repository: Repository<T>;

  constructor(opts: DocumentMetadataOpts<T>) {
    super(opts.manager, opts.DocumentClass, opts.fields);
    this.client = opts.client;
    this.db = opts.db;
    this.collection = opts.collection;
    this.extensions = opts.extensions || {};
    this.repository = opts.repository;
    this.repository.setDocumentMetadata(this);
  }

  isRoot(): boolean {
    return true;
  }
}
