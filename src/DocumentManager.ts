import { MongoClient, SessionOptions } from 'mongodb';
import { DocumentClass, Collection, Db, OptionalId } from './types';
import { DocumentMetadataFactory } from './metadata/DocumentMetadataFactory';
import { DocumentMetadata } from './metadata/DocumentMetadata';
import { Connection, ConnectionOptions } from './connection/Connection';
import { Repository } from './repository/Repository';
import { Session } from './transaction/Session';

export interface DocumentManagerOptions {
  connection: ConnectionOptions;
  documents: DocumentClass<any>[];
}

/**
 * DocumentManager is responsible for all mapped document classes.
 *
 * This is where all the magic happens. :)
 */
export class DocumentManager {
  public readonly metadataFactory: DocumentMetadataFactory;
  public readonly connection: Connection;

  constructor(private readonly opts: DocumentManagerOptions) {
    if (!this.opts.connection) {
      throw new Error('DocumentManager needs a connection.');
    }

    this.connection = Connection.create(this.opts.connection);

    this.metadataFactory = new DocumentMetadataFactory({
      dm: this,
      documents: opts.documents
    });
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  buildMetadata(): void {
    this.metadataFactory.build();
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getMetadataFor<T>(DocumentClass: DocumentClass<T>): DocumentMetadata<T> {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass);
  }

  /**
   * Filters metadata by given criteria.
   */
  filterMetadata(
    filter: (value: DocumentMetadata) => boolean
  ): DocumentMetadata[] {
    return this.metadataFactory.filterMetadata(filter);
  }

  init<T>(DocumentClass: DocumentClass<T>, props: Partial<T>): T {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).init(props);
  }

  toDB<T>(DocumentClass: DocumentClass<T>, model: T): OptionalId<T> {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).toDB(model);
  }

  fromDB<T>(DocumentClass: DocumentClass<T>, doc: Partial<T>): T {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).fromDB(doc);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------

  /**
   * Connects to all configured MongoClients.
   */
  connect(): Promise<void> {
    return this.connection.connect();
  }

  /**
   * Gets the mongo database for the class.
   */
  client(): MongoClient {
    return this.connection.client;
  }

  /**
   * Closes to all MongoClients.
   */
  close(force?: boolean): Promise<void> {
    return this.connection.close(force);
  }

  /**
   * Gets the mongo database for the class.
   */
  db<T>(target: DocumentClass<T>): Db {
    return this.getMetadataFor(target).db;
  }

  /**
   * Gets the mongo Collection for the class.
   */
  collection<T>(target: DocumentClass<T>): Collection<T> {
    return this.getMetadataFor<T>(target).collection;
  }

  getRepository<T extends Repository<any>>(target: DocumentClass): T;
  getRepository<T>(target: DocumentClass<T>): Repository<T> {
    return this.getMetadataFor<T>(target).repository;
  }

  startSession(opts?: SessionOptions): Session {
    const session = new Session(this);

    if (opts) {
      session.setSessionOptions(opts);
    }

    return session;
  }

  // -------------------------------------------------------------------------
  // Static Methods
  // -------------------------------------------------------------------------

  static async create(opts: DocumentManagerOptions): Promise<DocumentManager> {
    const dm = new DocumentManager(opts);

    await dm.connect();
    dm.buildMetadata();

    return dm;
  }
}
