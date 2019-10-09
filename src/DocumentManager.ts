import { DocumentType, Collection, Db, PropsOf } from './common/types';
import { DocumentMetadataFactory } from './metadata/DocumentMetadataFactory';
import { DocumentMetadata } from './metadata/DocumentMetadata';
import {
  ConnectionManager,
  ConnectionManagerOptions
} from './connection/ConnectionManager';
import { EventSubscriber } from './events/interfaces';
import { EventManager } from './events';
import { Repository } from './repository/Repository';

export interface DocumentManagerOptions {
  connections?: ConnectionManagerOptions[];
  connection?: ConnectionManagerOptions;
  documents: DocumentType<any>[];
  subscribers?: EventSubscriber[];
}

/**
 * DocumentManager is responsible for all mapped document classes.
 *
 * This is where all the magic happens. :)
 */
export class DocumentManager {
  public readonly metadataFactory: DocumentMetadataFactory;
  public readonly connectionManager: ConnectionManager;
  public readonly eventManager: EventManager;

  constructor(private readonly opts: DocumentManagerOptions) {
    if (this.opts.connection && this.opts.connections) {
      throw new Error(
        'DocumentManager cannot have both "connection" and "connections" options.'
      );
    }

    if (!this.opts.connection && !this.opts.connections) {
      throw new Error('DocumentManager needs a connection.');
    }

    this.connectionManager = ConnectionManager.create(
      this.opts.connection ? [this.opts.connection] : this.opts.connections
    );

    this.metadataFactory = new DocumentMetadataFactory({
      dm: this,
      documents: opts.documents
    });

    this.eventManager = new EventManager(this.opts.subscribers);
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  buildMetadata(): void {
    this.metadataFactory.build();
  }

  buildSubscribers(): void {
    this.eventManager.build(this);
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getMetadataFor<T>(DocumentClass: DocumentType<T>): DocumentMetadata<T> {
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

  init<T>(DocumentClass: DocumentType<T>, props: PropsOf<T>): T {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).init(props);
  }

  toDB<T>(DocumentClass: DocumentType<T>, model: T): PropsOf<T> {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).toDB(model);
  }

  fromDB<T>(DocumentClass: DocumentType<T>, doc: PropsOf<T>): T {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).fromDB(doc);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------

  /**
   * Connects to all configured MongoClients.
   */
  connect(): Promise<void> {
    return this.connectionManager.connect();
  }

  /**
   * Closes to all MongoClients.
   */
  close(force?: boolean): Promise<void> {
    return this.connectionManager.close(force);
  }

  /**
   * Gets the mongo database for the class.
   */
  db<T>(target: DocumentType<T>): Db {
    return this.getMetadataFor(target).db;
  }

  /**
   * Gets the mongo Collection for the class.
   */
  collection<T>(target: DocumentType<T>): Collection<T> {
    return this.getMetadataFor<T>(target).collection;
  }

  getRepository<T extends Repository<any>>(target: DocumentType): T;
  getRepository<T>(target: DocumentType<T>): Repository<T> {
    return this.getMetadataFor<T>(target).repository;
  }

  // -------------------------------------------------------------------------
  // Static Methods
  // -------------------------------------------------------------------------

  static async create(opts: DocumentManagerOptions): Promise<DocumentManager> {
    const dm = new DocumentManager(opts);

    await dm.connect();

    dm.buildMetadata();
    dm.buildSubscribers();

    return dm;
  }
}
