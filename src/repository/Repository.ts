import {
  Cursor,
  Collection,
  Db,
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
  PropsOf,
  ObjectId
} from '../common/types';
import { DocumentMetadata } from '../metadata/DocumentMetadata';
import { TypeMongoError } from '../errors';
import { DocumentManager } from '../DocumentManager';
import { Events } from '../events';

/**
 * Repository for documents
 */
export class Repository<T> {
  private _manager: DocumentManager;
  private _metadata: DocumentMetadata<T>;

  get manager(): DocumentManager {
    return this._manager;
  }

  set manager(manager: DocumentManager) {
    if (this._manager) {
      throw new Error('Cannot set DocumentManager for repository');
    }

    this._manager = manager;
  }

  get metadata(): DocumentMetadata<T> {
    return this._metadata;
  }

  set metadata(metadata: DocumentMetadata<T>) {
    if (this._metadata) {
      throw new Error('Cannot set DocumentMetadata for repository');
    }

    this._metadata = metadata;
  }

  /**
   * Gets the mongo database for the class.
   */
  get db(): Db {
    return this.metadata.db;
  }

  /**
   * Gets the mongo Collection for the class.
   */
  get collection(): Collection<T> {
    return this.metadata.collection;
  }

  init(props: PropsOf<OptionalId<T>>): T {
    return this.metadata.init(props);
  }

  toDB(model: T): PropsOf<T> {
    return this.metadata.toDB(model);
  }

  fromDB(doc: PropsOf<T>): T {
    return this.metadata.fromDB(doc);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------

  /**
   * Creates the document id.
   */
  id(id?: string | ObjectId): ObjectId {
    return this.metadata.id(id);
  }

  find(query?: FilterQuery<T>): Cursor<T>;
  find(query: FilterQuery<T>, options?: FindOptions): Cursor<T>;
  find(query: FilterQuery<T>, opts?: FindOptions): Cursor<T> {
    const cursor = this.collection.find(query, opts);
    cursor.map((doc: any) => this.metadata.fromDB(doc));

    return cursor;
  }

  async findById(id: any): Promise<T | null> {
    return this.findOne({ _id: this.id(id) });
  }

  async findByIdOrFail(id: any): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      { _id: id },
      await this.findById(id)
    );
  }

  async findOne(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions
  ): Promise<T | null> {
    const found = await this.collection.findOne(filter, opts);

    return found ? this.metadata.fromDB(found) : null;
  }

  async findOneOrFail(
    filter: FilterQuery<T>,
    opts?: FindOneOptions
  ): Promise<T | null> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOne(filter, opts)
    );
  }

  create(props: OptionalId<PropsOf<T>>, opts?: InsertOneOptions): Promise<T>;
  create(
    props: OptionalId<PropsOf<T>>[],
    opts?: InsertManyOptions
  ): Promise<T[]>;
  async create(
    props: OptionalId<PropsOf<T>> | OptionalId<PropsOf<T>>[],
    opts?: InsertOneOptions | InsertManyOptions
  ): Promise<T | T[]> {
    return Array.isArray(props)
      ? this.createMany(props, opts)
      : this.createOne(props, opts);
  }

  async createOne(
    props: OptionalId<PropsOf<T>>,
    opts?: InsertOneOptions
  ): Promise<T> {
    const model = this.init(props);

    const { result } = await this.insertOne(model, opts);

    return result && result.ok ? model : null;
  }

  async createMany(
    props: OptionalId<PropsOf<T>>[],
    opts?: InsertManyOptions
  ): Promise<T[]> {
    const models = props.map(p => this.init(p));
    const { insertedIds } = await this.insertMany(models, opts);

    return Object.keys(insertedIds).map(i => models[i]);
  }

  async insertOne(
    model: OptionalId<T>,
    opts?: InsertOneOptions
  ): Promise<InsertOneResult> {
    if (!model._id) {
      model._id = this.id();
    }

    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeInsert,
      Events.AfterInsert,
      {
        meta: this.metadata,
        model: model as T
      },
      () => this.collection.insertOne(this.metadata.toDB(model), opts)
    );
  }

  async insertMany(
    models: OptionalId<T>[],
    opts?: InsertManyOptions
  ): Promise<InsertManyResult> {
    const beforeInsertEvents: Promise<any>[] = [];
    const afterInsertEvents: Promise<any>[] = [];

    models.forEach(model => {
      if (!model._id) {
        model._id = this.id();
      }

      beforeInsertEvents.push(
        this.manager.eventManager.dispatch(Events.BeforeInsert, {
          meta: this.metadata,
          model: model as T
        })
      );

      afterInsertEvents.push(
        this.manager.eventManager.dispatch(Events.AfterInsert, {
          meta: this.metadata,
          model: model as T
        })
      );
    });

    await Promise.all(beforeInsertEvents);

    const result = this.collection.insertMany(
      models.map(model => this.metadata.toDB(model)),
      opts
    );

    await Promise.all(afterInsertEvents);

    return result;
  }

  async findOneAndUpdate(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    opts: FindOneAndUpdateOptions = {}
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update
      },
      async () =>
        this.runQuery(
          this.collection.findOneAndUpdate(filter, update, {
            returnOriginal: false,
            ...opts
          })
        )
    );
  }

  async findOneAndReplace(
    filter: FilterQuery<T>,
    props: OptionalId<PropsOf<T>>,
    opts?: FindOneAndReplaceOptions
  ): Promise<T | null> {
    return this.runQuery(
      this.collection.findOneAndReplace(filter, props, {
        returnOriginal: false,
        ...opts
      })
    );
  }

  async findOneAndDelete(
    filter: FilterQuery<T>,
    opts?: FindOneAndDeleteOptions
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        meta: this.metadata,
        filter
      },
      async () => this.runQuery(this.collection.findOneAndDelete(filter, opts))
    );
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateOneResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update
      },
      () => this.collection.updateOne(filter, update, opts)
    );
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateManyResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdateMany,
      Events.AfterUpdateMany,
      {
        meta: this.metadata,
        filter,
        update
      },
      () => this.collection.updateMany(filter, update, opts)
    );
  }

  async replaceOne(
    filter: FilterQuery<T>,
    props: OptionalId<PropsOf<T>>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceOneResult> {
    return this.collection.replaceOne(
      filter,
      this.metadata.toDB(this.metadata.init(props)),
      opts
    );
  }

  async deleteOne(
    filter: FilterQuery<T>,
    opts?: DeleteOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        meta: this.metadata,
        filter
      },
      async () => {
        const result = await this.collection.deleteOne(filter, opts);

        return result && result.deletedCount === 1;
      }
    );
  }

  async deleteMany(
    filter: FilterQuery<T>,
    opts?: DeleteOptions
  ): Promise<DeleteResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDeleteMany,
      Events.AfterDeleteMany,
      {
        meta: this.metadata,
        filter
      },
      () => this.collection.deleteMany(filter, opts)
    );
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected failIfEmpty(
    meta: DocumentMetadata<T>,
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

  protected async runQuery<T1 extends { ok?: number; value?: any }>(
    query: Promise<T1>
  ): Promise<T | null> {
    const data = await query;

    return data && data.ok && data.value
      ? this.metadata.fromDB(data.value)
      : null;
  }
}
