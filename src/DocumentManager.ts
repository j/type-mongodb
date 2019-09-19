import { Collection, Db } from 'mongodb';
import {
  Newable,
  Cursor,
  OptionalId,
  InsertOneOptions,
  InsertOneResult,
  InsertManyOptions,
  InsertManyResult,
  FilterQuery,
  FindOptions,
  FindOneOptions,
  FindOneAndDeleteOptions,
  FindOneAndUpdateOptions,
  UpdateQuery,
  FindOneAndReplaceOptions,
  UpdateManyResult,
  UpdateManyOptions,
  UpdateOneResult,
  UpdateOneOptions,
  ReplaceOneResult,
  ReplaceOneOptions,
  DeleteOptions,
  DeleteResult,
  FieldsOf,
  WithId
} from './common/types';
import { DocumentMetadataFactory } from './metadata/DocumentMetadataFactory';
import { DocumentMetadata } from './metadata/DocumentMetadata';
import { TypeMongoError } from './errors';
import {
  ConnectionManager,
  ConnectionManagerOptions
} from './connection/ConnectionManager';
import { EventSubscriber, Events } from './events/interfaces';
import { EventManager } from './events';

export interface DocumentManagerOptions {
  connections?: ConnectionManagerOptions[];
  connection?: ConnectionManagerOptions;
  documents: Newable<any>[];
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
  getMetadataFor<M, D = FieldsOf<M>>(
    DocumentClass: Newable<M>
  ): DocumentMetadata<M, D> {
    return this.metadataFactory.getMetadataFor(DocumentClass);
  }

  /**
   * Filters metadata by given criteria.
   */
  filterMetadata(
    filter: (value: DocumentMetadata) => boolean
  ): DocumentMetadata[] {
    return this.metadataFactory.filterMetadata(filter);
  }

  toDB<M, D = FieldsOf<M>>(DocumentClass: Newable<M>, model: M): D {
    return this.metadataFactory.getMetadataFor<M, D>(DocumentClass).toDB(model);
  }

  fromDB<M, D = FieldsOf<M>>(DocumentClass: Newable<M>, doc: D): M {
    return this.metadataFactory.getMetadataFor<M, D>(DocumentClass).fromDB(doc);
  }

  init<M>(DocumentClass: Newable<M>, props: Partial<M>): M {
    return this.metadataFactory.getMetadataFor<M>(DocumentClass).init(props);
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
  db(target: Newable): Db {
    return this.getMetadataFor(target).db;
  }

  /**
   * Gets the mongo Collection for the class.
   */
  collection<M = any, D = FieldsOf<M>>(target: Newable<M>): Collection<M> {
    return this.getMetadataFor<M, D>(target).collection;
  }

  find<M = any>(target: Newable<M>, query?: FilterQuery<M>): Cursor<M>;
  find<M = any>(
    target: Newable<M>,
    query: FilterQuery<M>,
    options?: FindOptions
  ): Cursor<M>;
  find<M = any>(
    target: Newable<M>,
    query: FilterQuery<M>,
    opts?: FindOptions
  ): Cursor<M> {
    const meta = this.getMetadataFor(target);
    const cursor = meta.collection.find(query, opts);
    cursor.map((doc: any) => meta.fromDB(doc));

    return cursor;
  }

  async findById<M = any>(target: Newable<M>, id: any): Promise<M | null> {
    const meta = this.getMetadataFor(target);

    return this.findOneForMeta(meta, { _id: meta.id(id) });
  }

  async findByIdOrFail<M = any>(target: Newable<M>, id: any): Promise<M> {
    return this.failIfEmpty(
      this.getMetadataFor(target),
      { _id: id },
      await this.findById(target, id)
    );
  }

  async findOne<M = any>(
    target: Newable<M>,
    filter: FilterQuery<WithId<M>>,
    opts?: FindOneOptions
  ): Promise<M | null> {
    return this.findOneForMeta(this.getMetadataFor(target), filter, opts);
  }

  async findOneOrFail<M = any>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    opts?: FindOneOptions
  ): Promise<M | null> {
    return this.failIfEmpty(
      this.getMetadataFor(target),
      filter,
      await this.findOne(target, filter, opts)
    );
  }

  create<M = any, D = FieldsOf<M>>(
    target: Newable<M>,
    props: OptionalId<D>,
    opts?: InsertOneOptions
  ): Promise<M>;
  create<M = any, D = FieldsOf<M>>(
    target: Newable<M>,
    props: OptionalId<D>[],
    opts?: InsertManyOptions
  ): Promise<M[]>;
  async create<M = any, D = FieldsOf<M>>(
    target: Newable<M>,
    props: OptionalId<D> | OptionalId<D>[],
    opts?: InsertOneOptions | InsertManyOptions
  ): Promise<M | M[]> {
    const meta = this.getMetadataFor(target);

    if (!Array.isArray(props)) {
      const model = meta.init(props as D);
      const { result } = await this.insertOne(model, opts);

      return result && result.ok ? model : null;
    }

    const models: M[] = props.map(p => meta.init(p as D));
    const { insertedIds } = await this.insertMany(target, models, opts);

    return Object.keys(insertedIds).map(i => models[i]);
  }

  async insertOne<M = any>(
    model: OptionalId<M>,
    opts?: InsertOneOptions
  ): Promise<InsertOneResult> {
    const meta = this.getMetadataFor(model.constructor as Newable<M>);

    if (!model._id) {
      model._id = meta.id();
    }

    return this.eventManager.dispatchBeforeAndAfter(
      Events.BeforeInsert,
      Events.AfterInsert,
      {
        meta,
        model
      },
      () => meta.collection.insertOne(meta.toDB(model as M), opts)
    );
  }

  async insertMany<M = any>(
    target: Newable<M>,
    models: OptionalId<M>[],
    opts?: InsertManyOptions
  ): Promise<InsertManyResult> {
    const meta = this.getMetadataFor(target);

    const beforeInsertEvents: Promise<any>[] = [];
    const afterInsertEvents: Promise<any>[] = [];

    models.forEach(model => {
      if (!model._id) {
        model._id = meta.id();
      }

      beforeInsertEvents.push(
        this.eventManager.dispatch(Events.BeforeInsert, {
          meta,
          model
        })
      );

      afterInsertEvents.push(
        this.eventManager.dispatch(Events.AfterInsert, {
          meta,
          model
        })
      );
    });

    await Promise.all(beforeInsertEvents);

    const result = meta.collection.insertMany(
      models.map(model => {
        if (!model._id) {
          model._id = meta.id();
        }

        return meta.toDB(model as M);
      }),
      opts
    );

    await Promise.all(afterInsertEvents);

    return result;
  }

  async findOneAndUpdate<M = any>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    update: UpdateQuery<M>,
    opts: FindOneAndUpdateOptions = {}
  ): Promise<M | null> {
    const meta = this.getMetadataFor(target);

    return await this.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        meta,
        filter,
        update
      },
      async () => {
        const result = await meta.collection.findOneAndUpdate(filter, update, {
          returnOriginal: false,
          ...opts
        });

        return this.mapResultFromDB(result, meta);
      }
    );
  }

  async findOneAndReplace<M = any, D = FieldsOf<M>>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    props: OptionalId<D>,
    opts?: FindOneAndReplaceOptions
  ): Promise<M | null> {
    const meta = this.getMetadataFor(target);

    const result = await meta.collection.findOneAndReplace(
      filter,
      meta.init(props) as Partial<M>,
      {
        returnOriginal: false,
        ...opts
      }
    );

    return this.mapResultFromDB(result, meta);
  }

  async findOneAndDelete<M = any>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    opts?: FindOneAndDeleteOptions
  ): Promise<M | null> {
    const meta = this.getMetadataFor(target);

    return await this.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        meta,
        filter
      },
      async () => {
        const result = await meta.collection.findOneAndDelete(filter, opts);

        return this.mapResultFromDB(result, meta);
      }
    );
  }

  async updateOne<M = any>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    update: UpdateQuery<M>,
    opts?: UpdateOneOptions
  ): Promise<UpdateOneResult> {
    const meta = this.getMetadataFor(target);

    return this.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        filter,
        meta,
        update
      },
      () => meta.collection.updateOne(filter, update, opts)
    );
  }

  async updateMany<M = any>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    update: UpdateQuery<M>,
    opts?: UpdateManyOptions
  ): Promise<UpdateManyResult> {
    const meta = this.getMetadataFor(target);

    return this.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdateMany,
      Events.AfterUpdateMany,
      {
        filter,
        meta,
        update
      },
      () => meta.collection.updateMany(filter, update, opts)
    );
  }

  async replaceOne<M = any, D = FieldsOf<M>>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    props: OptionalId<D>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceOneResult> {
    const meta = this.getMetadataFor(target);

    return await meta.collection.replaceOne(
      filter,
      meta.toDB(meta.init(props)),
      opts
    );
  }

  async deleteOne<M = any>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    opts?: DeleteOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean> {
    const meta = this.getMetadataFor(target);

    return await this.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        filter,
        meta
      },
      async (): Promise<any> => {
        const result = await meta.collection.deleteOne(filter, opts);

        return result && result.deletedCount === 1;
      }
    );
  }

  async deleteMany<M = any>(
    target: Newable<M>,
    filter: FilterQuery<M>,
    opts?: DeleteOptions
  ): Promise<DeleteResult> {
    const meta = this.getMetadataFor(target);

    return this.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDeleteMany,
      Events.AfterDeleteMany,
      {
        filter,
        meta
      },
      () => this.getMetadataFor(target).collection.deleteMany(filter, opts)
    );
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected async findOneForMeta<M = any>(
    meta: DocumentMetadata<M>,
    filter: any,
    opts?: FindOneOptions
  ): Promise<M | null> {
    const found = await meta.collection.findOne(filter, opts);

    return found ? meta.fromDB(found) : null;
  }

  protected failIfEmpty<M>(
    meta: DocumentMetadata<M>,
    criteria: FilterQuery<any>,
    value: any
  ) {
    if (!value) {
      if (
        criteria &&
        Object.keys(criteria).length === 1 &&
        typeof criteria._id !== 'undefined'
      ) {
        throw new TypeMongoError(
          `"${meta.name}" with id "${criteria._id}" not found`
        );
      }

      throw new TypeMongoError(
        `"${meta.name}" not found with criteria: '${JSON.stringify(criteria)}'`
      );
    }

    return value;
  }

  protected mapResultFromDB<M = any>(
    data: { ok?: number; value?: any },
    meta: DocumentMetadata<M>
  ): M | null {
    return data && data.ok && data.value ? meta.fromDB(data.value) : null;
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
