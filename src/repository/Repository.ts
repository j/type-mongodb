import {
  Cursor,
  ObjectId,
  FindOneOptions,
  FindOneAndUpdateOption,
  FindOneAndReplaceOption,
  FindOneAndDeleteOption,
  UpdateWriteOpResult,
  ReplaceWriteOpResult,
  DeleteWriteOpResultObject,
} from 'mongodb';
import {
  Collection,
  Db,
  OptionalId,
  InsertOneWriteOpResult,
  CommonOptions,
  FilterQuery,
  UpdateQuery,
  UpdateManyOptions,
  UpdateOneOptions,
  ReplaceOneOptions,
  CollectionInsertOneOptions,
  InsertWriteOpResult,
  CollectionInsertManyOptions,
} from '../types';
import { DocumentMetadata } from '../metadata/DocumentMetadata';
import { DocumentNotFound } from '../errors';
import { DocumentManager } from '../DocumentManager';
import { AbstractRepository } from './AbstractRepository';
import { Events } from '../events';

/**
 * Repository for documents
 */
export class Repository<T> extends AbstractRepository<T> {
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

  init(props: Partial<T>): T {
    return this.metadata.init(props);
  }

  toDB(model: Partial<T> | { [key: string]: any }): OptionalId<T | any> {
    return this.metadata.toDB(model);
  }

  fromDB(doc: Partial<T | any> | { [key: string]: any }): T {
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

  /**
   * Creates the document id.
   */
  isValidId(id?: any): boolean {
    return this.metadata.isValidId(id);
  }

  find(query?: FilterQuery<T | any>): Cursor<T>;
  find(query: FilterQuery<T | any>, opts: FindOneOptions): Cursor<T>;
  find(query: FilterQuery<T | any>, opts?: FindOneOptions): Cursor<T> {
    const cursor = this.collection.find(query, opts);
    cursor.map((doc: any) => this.fromDB(doc));

    return cursor;
  }

  findByIds(ids: any[]): Cursor<T>;
  findByIds(ids: any[], opts: FindOneOptions): Cursor<T>;
  findByIds(ids: any[], opts?: FindOneOptions): Cursor<T> {
    return this.find(
      {
        _id: { $in: ids.map((id) => this.id(id)) },
      },
      opts
    );
  }

  async findById(id: any, opts?: FindOneOptions): Promise<T | null> {
    return this.findOne({ _id: this.id(id) }, opts);
  }

  async findByIdOrFail(id: any, opts?: FindOneOptions): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      { _id: id },
      await this.findById(id, opts)
    );
  }

  async findOne(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions
  ): Promise<T | null> {
    const found = await this.collection.findOne(filter, opts);

    return found ? this.fromDB(found) : null;
  }

  async findOneOrFail(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions
  ): Promise<T | null> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOne(filter, opts)
    );
  }

  create(props: Partial<T>, opts?: CollectionInsertOneOptions): Promise<T>;
  create(props: Partial<T>[], opts?: CollectionInsertManyOptions): Promise<T[]>;
  async create(
    props: Partial<T> | Partial<T>[],
    opts?: CollectionInsertOneOptions | CollectionInsertManyOptions
  ): Promise<T | T[]> {
    return Array.isArray(props)
      ? this.createMany(props, opts)
      : this.createOne(props, opts);
  }

  async createOne(
    props: Partial<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<T> {
    const model = this.init(props);

    const { result } = await this.insertOne(model as OptionalId<T>, opts);

    return result && result.ok ? model : null;
  }

  async createMany(
    props: Partial<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<T[]> {
    const models = props.map((p) => this.init(p));
    const { insertedIds } = await this.insertMany(
      models as Array<OptionalId<T>>,
      opts
    );

    return Object.keys(insertedIds).map((i) => models[i]);
  }

  async insertOne(
    model: OptionalId<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<InsertOneWriteOpResult<any>> {
    const doc = this.toDB(model as T);

    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeInsert,
      Events.AfterInsert,
      {
        meta: this.metadata,
        model: model as T,
      },
      () => this.collection.insertOne(doc, opts)
    );
  }

  async insertMany(
    models: OptionalId<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<InsertWriteOpResult<any>> {
    const beforeInsertEvents: Promise<any>[] = [];
    const afterInsertEvents: Promise<any>[] = [];

    const docs: OptionalId<T>[] = models.map((model) => this.toDB(model as T));

    models.forEach((model) => {
      if (!model._id) {
        model._id = this.id() as any;
      }

      beforeInsertEvents.push(
        this.manager.eventManager.dispatch(Events.BeforeInsert, {
          meta: this.metadata,
          model: model as T,
        })
      );

      afterInsertEvents.push(
        this.manager.eventManager.dispatch(Events.AfterInsert, {
          meta: this.metadata,
          model: model as T,
        })
      );
    });

    await Promise.all(beforeInsertEvents);

    const result = this.collection.insertMany(docs, opts);

    await Promise.all(afterInsertEvents);

    return result;
  }

  async findOneAndUpdate(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts: FindOneAndUpdateOption = {}
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update,
      },
      async () => {
        return this.findOneAnd('Update', filter, update, {
          returnOriginal: false,
          ...opts,
        });
      }
    );
  }

  async findOneAndUpdateOrFail(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts: FindOneAndUpdateOption = {}
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndUpdate(filter, update, opts)
    );
  }

  async findByIdAndUpdate(
    id: any,
    update: UpdateQuery<T>,
    opts: FindOneAndUpdateOption = {}
  ): Promise<T | null> {
    return this.findOneAndUpdate({ _id: this.id(id) }, update, opts);
  }

  async findByIdAndUpdateOrFail(
    id: any,
    update: UpdateQuery<T>,
    opts: FindOneAndUpdateOption = {}
  ): Promise<T> {
    return this.findOneAndUpdateOrFail({ _id: this.id(id) }, update, opts);
  }

  async findOneAndReplace(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T | null> {
    return this.findOneAnd('Replace', filter, props, {
      returnOriginal: false,
      ...opts,
    });
  }

  async findOneAndReplaceOrFail(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndReplaceOrFail(filter, props, opts)
    );
  }

  async findByIdAndReplace(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T | null> {
    return this.findOneAndReplace({ _id: this.id(id) }, props, opts);
  }

  async findByIdAndReplaceOrFail(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T | null> {
    return this.findOneAndReplaceOrFail({ _id: this.id(id) }, props, opts);
  }

  async findOneAndDelete(
    filter: FilterQuery<T | any>,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        meta: this.metadata,
        filter,
      },
      async () => this.findOneAnd('Delete', filter, opts)
    );
  }

  async findOneAndDeleteOrFail(
    filter: FilterQuery<T | any>,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndDelete(filter, opts)
    );
  }

  async findByIdAndDelete(
    id: any,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null> {
    return this.findOneAndDelete({ _id: this.id(id) }, opts);
  }

  async findByIdAndDeleteOrFail(
    id: any,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null> {
    return this.findOneAndDeleteOrFail({ _id: this.id(id) }, opts);
  }

  async updateOne(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update,
      },
      () => this.collection.updateOne(filter, update, opts)
    );
  }

  async updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult> {
    return this.updateOne({ _id: this.id(id) }, update, opts);
  }

  async updateMany(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdateMany,
      Events.AfterUpdateMany,
      {
        meta: this.metadata,
        filter,
        update,
      },
      () => this.collection.updateMany(filter, update, opts)
    );
  }

  async updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult> {
    return this.updateMany(
      { _id: { $in: ids.map((id) => this.id(id)) } },
      update,
      opts
    );
  }

  async replaceOne(
    filter: FilterQuery<T | any>,
    props: Partial<T>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult> {
    return this.collection.replaceOne(
      filter,
      this.toDB(this.init(props)) as T,
      opts
    );
  }

  async replaceById(
    id: any,
    props: Partial<T>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult> {
    return this.replaceOne({ _id: this.id(id) }, props, opts);
  }

  async deleteOne(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        meta: this.metadata,
        filter,
      },
      async () => {
        const result = await this.collection.deleteOne(filter, opts);

        return result && result.deletedCount === 1;
      }
    );
  }

  async deleteById(
    id: any,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean> {
    return this.deleteOne({ _id: this.id(id) }, opts);
  }

  async deleteMany(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDeleteMany,
      Events.AfterDeleteMany,
      {
        meta: this.metadata,
        filter,
      },
      () => this.collection.deleteMany(filter, opts)
    );
  }

  async deleteByIds(
    ids: any[],
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject> {
    return this.deleteMany(
      { _id: { $in: ids.map((id) => this.id(id)) } },
      opts
    );
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected failIfEmpty(
    meta: DocumentMetadata<T>,
    filter: FilterQuery<any>,
    value: any
  ) {
    if (!value) {
      throw new DocumentNotFound(meta, filter);
    }

    return value;
  }

  protected async findOneAnd(
    op: 'Update' | 'Replace' | 'Delete',
    filter: FilterQuery<T | any>,
    ...args: any
  ): Promise<T | null> {
    const result = await this.collection[`findOneAnd${op}`].apply(
      this.collection,
      [filter, ...args]
    );

    return result && result.ok && result.value
      ? this.fromDB(result.value)
      : null;
  }
}
