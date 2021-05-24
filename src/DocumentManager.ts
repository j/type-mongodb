import {
  MongoClient,
  Collection,
  Db,
  ClientSessionOptions,
  TransactionOptions,
  WithTransactionCallback,
  ClientSession
} from 'mongodb';
import { DocumentClass, Newable } from './typings';
import { DocumentMetadataFactory } from './metadata';
import { DocumentMetadata } from './metadata';
import { Connection, ConnectionOptions } from './connection/Connection';
import { EventSubscriber } from './events';
import { EventManager } from './events';
import { Repository } from './repository';
import { EmbeddedDocumentMetadata } from './metadata';
import { DocumentTransformer } from './transformer';
import { InternalError } from './errors';

export interface ContainerLike {
  get: <T = any>(service: Newable<T>) => any;
}

export interface WithTransactionOptions {
  session?: ClientSessionOptions;
  transaction?: TransactionOptions;
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

  private constructor(private readonly opts: DocumentManagerOptions) {
    if (!this.opts.connection) {
      InternalError.throw('DocumentManager needs a connection.');
    }

    this.connection = Connection.create(this.opts.connection);

    this.metadataFactory = new DocumentMetadataFactory({
      manager: this,
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

    InternalError.throw(`Missing metadata for "${Cls.name}"`);
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
    model: Partial<T> | { [key: string]: any }
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

  startSession(opts?: ClientSessionOptions): ClientSession {
    return this.connection.client.startSession(opts);
  }

  async withTransaction<T = any>(
    fn: WithTransactionCallback<T>,
    opts: WithTransactionOptions = {}
  ): Promise<T | void> {
    let result: T;

    const session = this.startSession(opts?.session);

    try {
      await session.withTransaction(async (session: ClientSession) => {
        result = (await fn(session)) as T;
      }, opts?.transaction);
    } catch (err) {
      throw err;
    } finally {
      await session.endSession();
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Static Methods
  // -------------------------------------------------------------------------

  static async create(opts: DocumentManagerOptions): Promise<DocumentManager> {
    const manager = new DocumentManager(opts);

    await manager.connect();

    await manager.buildMetadata();
    manager.buildSubscribers();

    DocumentTransformer.compile();

    return manager;
  }
}
