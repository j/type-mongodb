import {
  MongoClient,
  Collection,
  Db,
  ClientSessionOptions,
  TransactionOptions,
  WithTransactionCallback,
  ClientSession,
  OptionalId,
  MongoClientOptions
} from 'mongodb';
import { Constructor, PartialDeep } from './typings';
import { DocumentMetadataFactory } from './metadata';
import { DocumentMetadata } from './metadata';
import { EventSubscriber } from './events';
import { EventManager } from './events';
import { Repository } from './repository';
import { EmbeddedDocumentMetadata } from './metadata';
import { DocumentTransformer } from './transformer';
import { InternalError } from './errors';

export interface ContainerLike {
  get: <T = any>(service: Constructor<T>) => any;
}

export interface WithTransactionOptions {
  session?: ClientSessionOptions;
  transaction?: TransactionOptions;
}

const defaultContainer = {
  get: <T = any>(Service: Constructor<T>) => new Service()
};

export type DocumentManagerOptions =
  | DocumentManagerOptionsUsingUri
  | DocumentManagerOptionsUsingClient;

interface BaseDocumentManagerOptions {
  documents: Constructor[];
  subscribers?: EventSubscriber[];
  container?: ContainerLike;
  shouldConnect?: boolean;
}

export interface DocumentManagerOptionsUsingUri
  extends BaseDocumentManagerOptions {
  uri: string;
  options?: MongoClientOptions;
}

export interface DocumentManagerOptionsUsingClient
  extends BaseDocumentManagerOptions {
  client: MongoClient;
}

/**
 * DocumentManager is responsible for all mapped document classes.
 *
 * This is where all the magic happens. :)
 */
export class DocumentManager {
  private constructor(
    public readonly client: MongoClient,
    public readonly metadataFactory: DocumentMetadataFactory,
    public readonly eventManager: EventManager,
    public readonly container: ContainerLike
  ) {}

  /**
   * Connects the MongoClient.
   */
  async connect(): Promise<MongoClient> {
    return await this.client.connect();
  }

  /**
   * Closes the MongoClient connection.
   */
  async close(force?: boolean): Promise<void> {
    await this.client.close(force);
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getMetadataFor<T>(DocumentClass: Constructor<T>): DocumentMetadata<T> {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass);
  }

  /**
   * Gets the EmbeddedDocumentMetadata for the given class.
   */
  getEmbeddedMetadataFor<T>(
    EmbeddedDocumentClass: Constructor<T>
  ): EmbeddedDocumentMetadata<T> {
    return this.metadataFactory.getEmbeddedMetadataFor<T>(
      EmbeddedDocumentClass
    );
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getAnyMetadata<T>(
    DocumentClass: Constructor<T>
  ): DocumentMetadata<T> | EmbeddedDocumentMetadata<T> {
    try {
      return this.getMetadataFor<T>(DocumentClass);
    } catch (err) {
      // no-op
    }

    try {
      return this.getEmbeddedMetadataFor<T>(DocumentClass);
    } catch (err) {
      // no-op
    }

    InternalError.throw(`Missing metadata for "${DocumentClass.name}"`);
  }

  /**
   * Filters metadata by given criteria.
   */
  filterMetadata(
    filter: (value: DocumentMetadata) => boolean
  ): DocumentMetadata[] {
    return this.metadataFactory.filterMetadata(filter);
  }

  init<T>(DocumentClass: Constructor<T>, props: PartialDeep<T>): T {
    return this.getAnyMetadata<T>(DocumentClass).init(props);
  }

  merge<T>(DocumentClass: Constructor<T>, model: T, props: PartialDeep<T>): T {
    return this.getAnyMetadata<T>(DocumentClass).merge(model, props);
  }

  toDB<T>(DocumentClass: Constructor<T>, model: T): OptionalId<any> {
    return this.getAnyMetadata<T>(DocumentClass).toDB(model);
  }

  fromDB<T>(DocumentClass: Constructor<T>, doc: Record<string, any>): T {
    return this.getAnyMetadata<T>(DocumentClass).fromDB(doc);
  }

  /**
   * Gets the mongo database for the class.
   */
  db<T>(DocumentClass: Constructor<T>): Db {
    return this.getMetadataFor(DocumentClass).db;
  }

  /**
   * Gets the mongo Collection for the class.
   */
  collection<T>(DocumentClass: Constructor<T>): Collection<T> {
    return this.getMetadataFor<T>(DocumentClass).collection;
  }

  getRepository<T extends Repository<any>>(DocumentClass: Constructor): T;
  getRepository<T>(DocumentClass: Constructor<T>): Repository<T> {
    return this.getMetadataFor<T>(DocumentClass).repository;
  }

  startSession(opts?: ClientSessionOptions): ClientSession {
    return this.client.startSession(opts);
  }

  async withTransaction<T = any>(
    cb: WithTransactionCallback<T>,
    opts: WithTransactionOptions = {}
  ): Promise<T | void> {
    let result: T;

    const session = this.startSession(opts?.session);

    try {
      await session.withTransaction(async (session: ClientSession) => {
        result = (await cb(session)) as T;
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

  static async create(
    opts: DocumentManagerOptionsUsingClient
  ): Promise<DocumentManager>;
  static async create(
    opts: DocumentManagerOptionsUsingUri
  ): Promise<DocumentManager>;
  static async create(opts: DocumentManagerOptions): Promise<DocumentManager>;
  static async create(opts: DocumentManagerOptions): Promise<DocumentManager> {
    let client: MongoClient;
    if ((opts as DocumentManagerOptionsUsingClient).client) {
      client = (opts as DocumentManagerOptionsUsingClient).client;
    } else if ((opts as DocumentManagerOptionsUsingUri).uri) {
      const { uri, options } = opts as DocumentManagerOptionsUsingUri;
      client = new MongoClient(uri, options);
    }

    if (!client) {
      InternalError.throw('Invalid MongoClient options.');
    }

    await client.connect();

    try {
      const manager = new DocumentManager(
        client,
        new DocumentMetadataFactory(opts.documents),
        new EventManager(opts.subscribers),
        opts.container || defaultContainer
      );

      await manager.metadataFactory.build(manager);
      manager.eventManager.build(manager);

      DocumentTransformer.compile();

      return manager;
    } catch (err) {
      await client.close();

      throw err;
    }
  }
}
