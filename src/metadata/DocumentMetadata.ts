import { Collection, Db, ObjectId } from 'mongodb';
import { PropsOf, OptionalId, DocumentType } from '../common/types';
import {
  AbstractDocumentMetadata,
  FieldsMetadata
} from './AbstractDocumentMetadata';
import { Connection } from '../connection/Connection';
import { Repository } from '../repository/Repository';

export interface DocumentMetadataOpts<T = any> {
  DocumentClass: DocumentType<T>;
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
export class DocumentMetadata<T = any> extends AbstractDocumentMetadata<T> {
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

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * Creates the document _id.
   */
  id(id?: string | ObjectId): ObjectId {
    return new ObjectId(id);
  }

  init(props: PropsOf<OptionalId<T>>): T {
    return super.init(this.prepare(props));
  }

  fromDB(doc: PropsOf<T>): T {
    return super.fromDB(doc);
  }

  toDB(model: OptionalId<T>): PropsOf<T> {
    return super.toDB(this.prepare(model));
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected prepare<T>(o: any): T {
    if (!o._id) {
      o._id = this.id();
    }

    return o as T;
  }
}
