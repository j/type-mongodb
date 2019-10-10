import { DocumentClass, Collection, Db, PropsOf } from './types';
import { DocumentMetadataFactory } from './metadata/DocumentMetadataFactory';
import { DocumentMetadata } from './metadata/DocumentMetadata';
import {
  ConnectionManager,
  ConnectionManagerOptions
} from './connection/ConnectionManager';
import { Repository } from './repository/Repository';

export interface DocumentManagerOptions {
  connections?: ConnectionManagerOptions[];
  connection?: ConnectionManagerOptions;
  documents: DocumentClass<any>[];
}

/**
 * DocumentManager is responsible for all mapped document classes.
 *
 * This is where all the magic happens. :)
 */
export class DocumentManager {
  public readonly metadataFactory: DocumentMetadataFactory;
  public readonly connectionManager: ConnectionManager;

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

  init<T>(DocumentClass: DocumentClass<T>, props: PropsOf<T>): T {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).init(props);
  }

  toDB<T>(DocumentClass: DocumentClass<T>, model: T): PropsOf<T> {
    return this.metadataFactory.getMetadataFor<T>(DocumentClass).toDB(model);
  }

  fromDB<T>(DocumentClass: DocumentClass<T>, doc: PropsOf<T>): T {
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
