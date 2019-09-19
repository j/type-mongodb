import { Collection, Db, ObjectId } from 'mongodb';
import { Newable, FieldsOf } from '../common/types';
import { BaseDocumentMetadata, FieldsMetadata } from './BaseDocumentMetadata';
import { Connection } from '../connection/Connection';

export interface DocumentMetadataOpts<M = any> {
  DocumentClass: Newable<M>;
  fields: FieldsMetadata;
  connection: Connection;
  db: Db;
  collection: Collection<M>;
  extensions?: Record<any, any>;
}

/**
 * DocumentMetadata contains all the needed info for Document classes.
 */
export class DocumentMetadata<
  M = any,
  D = FieldsOf<M>
> extends BaseDocumentMetadata<M, D> {
  public readonly connection: Connection;
  public readonly db: Db;
  public readonly collection: Collection;
  public readonly extensions: Record<any, any>;

  constructor(opts: DocumentMetadataOpts<M>) {
    super(opts.DocumentClass, opts.fields);
    this.connection = opts.connection;
    this.db = opts.db;
    this.collection = opts.collection;
    this.extensions = opts.extensions || {};
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
}
