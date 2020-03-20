import { MongoClient, SessionOptions } from 'mongodb';
import { DocumentClass, Collection, Db, Newable } from './types';
import { DocumentMetadataFactory } from './metadata/DocumentMetadataFactory';
import { DocumentMetadata } from './metadata/DocumentMetadata';
import { Connection, ConnectionOptions } from './connection/Connection';
import { EventSubscriber } from './events/interfaces';
import { EventManager } from './events';
import { Repository } from './repository/Repository';
import { Session } from './transaction/Session';
import { EmbeddedDocumentMetadata } from './metadata/EmbeddedDocumentMetadata';

export interface ContainerLike {
  get: <T = any>(service: Newable<T>) => any;
}

const defaultContainer = {
  get: <T = any>(Service: Newable<T>) => new Service()
};

export interface DocumentManagerOptions {
  connection: ConnectionOptions;
  documents: DocumentClass<any>[];
  subscribers?: EventSubscriber[];
  container?: ContainerLike;
}

/**
 * DocumentManager is responsible for all mapped document classes.
 *
 * This is where all the magic happens. :)
 */
export class DocumentManager {
  public readonly metadataFactory: DocumentMetadataFactory;
  public readonly connection: Connection;
  public readonly eventManager: EventManager;
  public readonly container: ContainerLike;

  constructor(private readonly opts: DocumentManagerOptions) {
    if (!this.opts.connection) {
      throw new Error('DocumentManager needs a connection.');
    }

    this.connection = Connection.create(this.opts.connection);

    this.metadataFactory = new DocumentMetadataFactory({
      dm: this,
      documents: opts.documents
    });

    this.eventManager = new EventManager(this.opts.subscribers);
    this.container = opts.container || defaultContainer;
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  async buildMetadata(): Promise<void> {
    await this.metadataFactory.build();
  }

  buildSubscribers(): void {
    this.eventManager.build(this);
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getMetadataFor<T>(DocumentClass: DocumentClass<T>): DocumentMetadata<T> {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass);
  }

  /**
   * Gets the EmbeddedDocumentMetadata for the given class.
   */
  getEmbeddedMetadataFor<T>(
    EmbeddedDocumentClass: Newable<T>
  ): EmbeddedDocumentMetadata<T> {
    return this.metadataFactory.getEmbeddedMetadataFor<T>(
      EmbeddedDocumentClass
    );
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getAnyMetadata<T>(
    Cls: DocumentClass<T> | Newable<T>
  ): DocumentMetadata<T> | EmbeddedDocumentMetadata<T> {
    try {
      return this.getMetadataFor<T>(Cls as DocumentClass<T>);
    } catch (err) {
      // no-op
    }

    try {
      return this.getEmbeddedMetadataFor<T>(Cls as Newable<T>);
    } catch (err) {
      // no-op
    }

    throw new Error(`Missing metadata for "${Cls.name}"`);
  }

  /**
   * Filters metadata by given criteria.
   */
  filterMetadata(
    filter: (value: DocumentMetadata) => boolean
  ): DocumentMetadata[] {
    return this.metadataFactory.filterMetadata(filter);
  }

  init<T>(
    DocumentClass: DocumentClass<T> | Newable<T>,
    props: Partial<T> | { [key: string]: any }
  ): T {
    return this.getAnyMetadata<T>(DocumentClass).init(props);
  }

  merge<T>(
    DocumentClass: DocumentClass<T> | Newable<T>,
    model: T,
    props: Partial<T> | { [key: string]: any }
  ): T {
    return this.getAnyMetadata<T>(DocumentClass).merge(model, props);
  }

  toDB<T>(
    DocumentClass: DocumentClass<T> | Newable<T>,
    model: T
  ): T & { [key: string]: any } {
    return this.getAnyMetadata<T>(DocumentClass).toDB(model);
  }

  fromDB<T>(
    DocumentClass: DocumentClass<T> | Newable<T>,
    doc: Partial<T> | { [key: string]: any }
  ): T {
    return this.getAnyMetadata<T>(DocumentClass).fromDB(doc);
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

    await dm.buildMetadata();
    dm.buildSubscribers();

    return dm;
  }
}
