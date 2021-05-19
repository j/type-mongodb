import {
  BulkWriteOptions,
  Collection,
  Db,
  DeleteOptions,
  DeleteResult,
  Filter,
  FindCursor,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOptions,
  InsertManyResult,
  InsertOneOptions,
  InsertOneResult,
  ModifyResult,
  OptionalId,
  UpdateOptions,
  UpdateQuery,
  UpdateResult
} from 'mongodb';
import { DocumentMetadata } from '../metadata';
import { InternalError, ValidationError } from '../errors';
import { DocumentManager } from '../DocumentManager';
import {
  AbstractRepository,
  TransformQueryFilterOptions
} from './AbstractRepository';
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
      InternalError.throw('Cannot set DocumentManager for repository');
    }

    this._manager = manager;
  }

  get metadata(): DocumentMetadata<T> {
    return this._metadata;
  }

  set metadata(metadata: DocumentMetadata<T>) {
    if (this._metadata) {
      InternalError.throw('Cannot set DocumentMetadata for repository');
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
  find(query?: Filter<T | any>): FindCursor<T>;
  find(query: Filter<T | any>, opts: FindOptions): FindCursor<T>;
  find(query: Filter<T | any>, opts?: FindOptions): FindCursor<T> {
    const cursor = this.collection.find(
      this.transformQueryFilter(query, opts),
      opts
    );
    cursor.map((doc: any) => this.fromDB(doc));

    return cursor;
  }

  findByIds(ids: any[]): FindCursor<T>;
  findByIds(ids: any[], opts: FindOptions): FindCursor<T>;
  findByIds(ids: any[], opts?: FindOptions): FindCursor<T> {
    return this.find(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      opts
    );
  }

  async findById(id: any, opts?: FindOptions): Promise<T | null> {
    return this.findOne({ [this.metadata.idField.propertyName]: id }, opts);
  }

  async findByIdOrFail(id: any, opts?: FindOptions): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      { [this.metadata.idField.propertyName]: id },
      await this.findById(id, opts)
    );
  }

  async findOne(
    filter: Filter<T | any>,
    opts?: FindOptions
  ): Promise<T | null> {
    const found = await this.collection.findOne(
      this.transformQueryFilter(filter, opts),
      opts
    );

    return found ? this.fromDB(found) : null;
  }

  async findOneOrFail(
    filter: Filter<T | any>,
    opts?: FindOptions
  ): Promise<T | null> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOne(filter, opts)
    );
  }

  create(props: Partial<T>, opts?: InsertOneOptions): Promise<T>;
  create(props: Partial<T>[], opts?: BulkWriteOptions): Promise<T[]>;
  async create(
    props: Partial<T> | Partial<T>[],
    opts?: InsertOneOptions | BulkWriteOptions
  ): Promise<T | T[]> {
    return Array.isArray(props)
      ? this.createMany(props, opts)
      : this.createOne(props, opts);
  }

  async createOne(props: Partial<T>, opts?: InsertOneOptions): Promise<T> {
    const model = this.init(props);

    const { acknowledged } = await this.insertOne(model as OptionalId<T>, opts);

    return acknowledged ? model : null;
  }

  async createMany(props: Partial<T>[], opts?: BulkWriteOptions): Promise<T[]> {
    const models = props.map((p) => this.init(p));
    const { insertedIds } = await this.insertMany(
      models as Array<OptionalId<T>>,
      opts
    );

    return Object.keys(insertedIds).map((i) => models[i]);
  }

  async insertOne(
    model: OptionalId<T>,
    opts?: InsertOneOptions
  ): Promise<InsertOneResult<any>> {
    const doc = this.toDB(model as T);

    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeInsert,
      Events.AfterInsert,
      {
        meta: this.metadata,
        model: model as T
      },
      () => this.collection.insertOne(doc, opts)
    );
  }

  async insertMany(
    models: OptionalId<T>[],
    opts?: BulkWriteOptions
  ): Promise<InsertManyResult<T>> {
    const beforeInsertEvents: Promise<any>[] = [];
    const afterInsertEvents: Promise<any>[] = [];

    const docs: OptionalId<T>[] = models.map((model) => this.toDB(model as T));
    const idProp = this.metadata.idField.propertyName;

    models.forEach((model) => {
      if (idProp && !model[idProp]) {
        model[idProp] = this.id.createJSValue();
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

    const result = this.collection.insertMany(docs, opts);

    await Promise.all(afterInsertEvents);

    return result;
  }

  async findOneAndUpdate(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update
      },
      async () => {
        const result = await this.collection.findOneAndUpdate(
          this.transformQueryFilter(filter, opts),
          update,
          opts
        );

        return this.fromModifyResult(result);
      }
    );
  }

  async findOneAndUpdateOrFail(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
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
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.findOneAndUpdate(
      { [this.metadata.idField.propertyName]: id },
      update,
      opts
    );
  }

  async findByIdAndUpdateOrFail(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.findOneAndUpdateOrFail(
      { [this.metadata.idField.propertyName]: id },
      update,
      opts
    );
  }

  async findOneAndReplace(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    const result = await this.collection.findOneAndReplace(
      this.transformQueryFilter(filter, opts),
      props,
      opts
    );

    return this.fromModifyResult(result);
  }

  async findOneAndReplaceOrFail(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndReplace(filter, props, opts)
    );
  }

  async findByIdAndReplace(
    id: any,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.findOneAndReplace(
      { [this.metadata.idField.propertyName]: id },
      props,
      opts
    );
  }

  async findByIdAndReplaceOrFail(
    id: any,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.findOneAndReplaceOrFail(
      { [this.metadata.idField.propertyName]: id },
      props,
      opts
    );
  }

  async findOneAndDelete(
    filter: Filter<T | any>,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        meta: this.metadata,
        filter
      },
      async () => {
        const result = await this.collection.findOneAndDelete(
          this.transformQueryFilter(filter, opts),
          opts
        );

        return this.fromModifyResult(result);
      }
    );
  }

  async findOneAndDeleteOrFail(
    filter: Filter<T | any>,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndDelete(filter, opts)
    );
  }

  async findByIdAndDelete(
    id: any,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.findOneAndDelete(
      { [this.metadata.idField.propertyName]: id },
      opts
    );
  }

  async findByIdAndDeleteOrFail(
    id: any,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.findOneAndDeleteOrFail(
      { [this.metadata.idField.propertyName]: id },
      opts
    );
  }

  async updateOne(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdate,
      Events.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update
      },
      () =>
        this.collection.updateOne(
          this.transformQueryFilter(filter, opts),
          update,
          opts
        ) as Promise<UpdateResult>
    );
  }

  async updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.updateOne(
      { [this.metadata.idField.propertyName]: id },
      update,
      opts
    );
  }

  async updateMany(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeUpdateMany,
      Events.AfterUpdateMany,
      {
        meta: this.metadata,
        filter,
        update
      },
      () =>
        this.collection.updateMany(
          this.transformQueryFilter(filter, opts),
          update,
          opts
        ) as Promise<UpdateResult>
    );
  }

  async updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.updateMany(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      update,
      opts
    );
  }

  async replaceOne(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    const model =
      props instanceof this.metadata.DocumentClass
        ? (props as T)
        : this.init(props);

    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeReplace,
      Events.AfterReplace,
      {
        meta: this.metadata,
        filter,
        model
      },
      async () => {
        const doc = this.toDB(model);
        delete doc._id;

        return (await this.collection.replaceOne(
          this.transformQueryFilter(filter, opts),
          doc,
          opts
        )) as UpdateResult;
      }
    );
  }

  async replaceById(
    id: any,
    props: Partial<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.replaceOne(
      { [this.metadata.idField.propertyName]: id },
      props,
      opts
    );
  }

  async deleteOne(
    filter: Filter<T | any>,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<boolean> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDelete,
      Events.AfterDelete,
      {
        meta: this.metadata,
        filter
      },
      async () => {
        const result = await this.collection.deleteOne(
          this.transformQueryFilter(filter, opts),
          opts
        );

        return result && result.deletedCount === 1;
      }
    );
  }

  async deleteById(
    id: any,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<boolean> {
    return this.deleteOne({ [this.metadata.idField.propertyName]: id }, opts);
  }

  async deleteMany(
    filter: Filter<T | any>,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<DeleteResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      Events.BeforeDeleteMany,
      Events.AfterDeleteMany,
      {
        meta: this.metadata,
        filter
      },
      () =>
        this.collection.deleteMany(
          this.transformQueryFilter(filter, opts),
          opts
        )
    );
  }

  async deleteByIds(
    ids: any[],
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<DeleteResult> {
    return this.deleteMany(
      {
        [this.metadata.idField.propertyName]: {
          $in: ids.map((i) => this.id.convertToDatabaseValue(i))
        }
      },
      {
        ...opts,
        transformQueryFilter: false
      }
    );
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected failIfEmpty(
    meta: DocumentMetadata<T>,
    filter: Filter<any>,
    value: any
  ) {
    if (!value) {
      ValidationError.documentNotFound(meta, filter);
    }

    return value;
  }

  protected fromModifyResult(result: ModifyResult<T>): T {
    return result && result.ok && result.value
      ? this.fromDB(result.value)
      : null;
  }
}
