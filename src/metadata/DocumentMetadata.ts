import { Collection, Db, MongoClient } from 'mongodb';
import { Constructor, WithDocumentFields } from '../typings';
import {
  AbstractDocumentMetadata,
  FieldsMetadata
} from './AbstractDocumentMetadata';
import { Repository } from '../repository';
import { DocumentManager } from '../DocumentManager';

export interface DocumentMetadataOpts<Model, Document> {
  DocumentClass: Constructor<Model>;
  manager: DocumentManager;
  fields: FieldsMetadata;
  client: MongoClient;
  db: Db;
  collection: Collection<Document>;
  repository: Repository<Model, Document>;
  extensions?: Record<any, any>;
}

/**
 * DocumentMetadata contains all the needed info for Document classes.
 */
export class DocumentMetadata<
  Model = any,
  Document = WithDocumentFields<Model>
> extends AbstractDocumentMetadata<Model, Document> {
  public readonly manager: DocumentManager;
  public readonly client: MongoClient;
  public readonly db: Db;
  public readonly collection: Collection<Document>;
  public readonly extensions: Record<any, any>;
  public readonly repository: Repository<Model, Document>;

  constructor(opts: DocumentMetadataOpts<Model, Document>) {
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
