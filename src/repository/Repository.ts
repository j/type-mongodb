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
import { EventSubscriberMethods, InsertManyEvent } from '../events';
import { Type } from '../types';
import { Mutable, PartialDeep } from '../typings';

/**
 * `type-mongodb` specific options
 */
export interface InternalOptions {
  transformQueryFilter?: boolean;
}

export type WithInternalOptions<
  T extends Record<any, any> = Record<any, any>
> = T & InternalOptions;

/**
 * Repository for documents
 */
export class Repository<T> {
  public readonly metadata: DocumentMetadata<T>;

  /**
   * Gets the DocumentManager for the repository.
   */
  get manager(): DocumentManager {
    return this.metadata.manager;
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

  /**
   * Gets the id field's type
   */
  get id(): Type {
    return this.metadata.idField.type;
  }

  /**
   * Applies the given metadata for the repository.
   *
   * @internal
   */
  setDocumentMetadata(metadata: DocumentMetadata<T>): void {
    if (typeof this.metadata !== 'undefined') {
      InternalError.throw(
        `Repository for "${this.metadata.name}" already has "metadata"`
      );
    }

    (this as Mutable<Repository<T>>).metadata = metadata;
  }

  init(props: PartialDeep<T>): T {
    return this.metadata.init(props);
  }

  merge(model: T, props: PartialDeep<T>): T {
    return this.metadata.merge(model, props);
  }

  toDB(model: T): OptionalId<any> {
    return this.metadata.toDB(model);
  }

  fromDB(doc: T): T {
    return this.metadata.fromDB(doc);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------
  find(query?: Filter<T | any>): FindCursor<T>;
  find(
    query: Filter<T | any>,
    opts: WithInternalOptions<FindOptions>
  ): FindCursor<T>;
  find(
    query: Filter<T | any>,
    opts?: WithInternalOptions<FindOptions>
  ): FindCursor<T> {
    const cursor = this.collection.find(
      this.prepareFilter(query, opts),
      this.prepareOptions(opts)
    );
    cursor.map((doc: any) => this.fromDB(doc));

    return cursor;
  }

  findByIds(ids: any[]): FindCursor<T>;
  findByIds(ids: any[], opts: WithInternalOptions<FindOptions>): FindCursor<T>;
  findByIds(
    ids: any[],
    opts?: WithInternalOptions<FindOptions>
  ): FindCursor<T> {
    return this.find(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      opts
    );
  }

  async findById(
    id: any,
    opts?: WithInternalOptions<FindOptions>
  ): Promise<T | null> {
    return this.findOne({ [this.metadata.idField.propertyName]: id }, opts);
  }

  async findByIdOrFail(
    id: any,
    opts?: WithInternalOptions<FindOptions>
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      { [this.metadata.idField.propertyName]: id },
      await this.findById(id, opts)
    );
  }

  async findOne(
    filter: Filter<T | any>,
    opts?: WithInternalOptions<FindOptions>
  ): Promise<T | null> {
    const found = await this.collection.findOne(
      this.prepareFilter(filter, opts),
      this.prepareOptions(opts)
    );

    return found ? this.fromDB(found) : null;
  }

  async findOneOrFail(
    filter: Filter<T | any>,
    opts?: WithInternalOptions<FindOptions>
  ): Promise<T | null> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOne(filter, opts)
    );
  }

  create(props: PartialDeep<T>, opts?: InsertOneOptions): Promise<T>;
  create(props: PartialDeep<T>[], opts?: BulkWriteOptions): Promise<T[]>;
  async create(
    props: PartialDeep<T> | PartialDeep<T>[],
    opts?: InsertOneOptions | BulkWriteOptions
  ): Promise<T | T[]> {
    return Array.isArray(props)
      ? this.createMany(props, opts)
      : this.createOne(props, opts);
  }

  async createOne(props: PartialDeep<T>, opts?: InsertOneOptions): Promise<T> {
    const model = this.init(props);

    const { acknowledged } = await this.insertOne(model, opts);

    return acknowledged ? model : null;
  }

  async createMany(
    props: PartialDeep<T>[],
    opts?: BulkWriteOptions
  ): Promise<T[]> {
    const models = props.map((p) => this.init(p));
    const { insertedIds } = await this.insertMany(models, opts);

    return Object.keys(insertedIds).map((i) => models[i]);
  }

  async insertOne(
    model: T,
    opts?: InsertOneOptions
  ): Promise<InsertOneResult<any>> {
    const doc = this.toDB(model);

    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeInsert,
      EventSubscriberMethods.AfterInsert,
      {
        meta: this.metadata,
        model
      },
      () => this.collection.insertOne(doc, this.prepareOptions(opts))
    );
  }

  async insertMany(
    models: T[],
    opts?: BulkWriteOptions
  ): Promise<InsertManyResult<T>> {
    const docs: OptionalId<T>[] = [];
    const idField = this.metadata.idField;

    models.forEach((model) => {
      const doc = this.toDB(model);
      docs.push(doc);

      if (typeof doc?.[idField.fieldName] !== 'undefined') {
        model[idField.propertyName] = doc[idField.fieldName];
      }
    });

    const event: InsertManyEvent = {
      meta: this.metadata,
      models: models
    };

    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeInsertMany,
      EventSubscriberMethods.AfterInsertMany,
      event,
      () => this.collection.insertMany(docs, this.prepareOptions(opts))
    );
  }

  async findOneAndUpdate(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeUpdate,
      EventSubscriberMethods.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update
      },
      async () => {
        const result = await this.collection.findOneAndUpdate(
          this.prepareFilter(filter, opts),
          update,
          this.prepareOptions(opts)
        );

        return this.fromModifyResult(result);
      }
    );
  }

  async findOneAndUpdateOrFail(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: WithInternalOptions<FindOneAndUpdateOptions>
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
    opts?: WithInternalOptions<FindOneAndUpdateOptions>
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
    opts?: WithInternalOptions<InternalOptions>
  ): Promise<T> {
    return this.findOneAndUpdateOrFail(
      { [this.metadata.idField.propertyName]: id },
      update,
      opts
    );
  }

  async findOneAndReplace(
    filter: Filter<T | any>,
    props: PartialDeep<T>,
    opts?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T | null> {
    const result = await this.collection.findOneAndReplace(
      this.prepareFilter(filter, opts),
      props,
      this.prepareOptions(opts)
    );

    return this.fromModifyResult(result);
  }

  async findOneAndReplaceOrFail(
    filter: Filter<T | any>,
    props: PartialDeep<T>,
    opts?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndReplace(filter, props, opts)
    );
  }

  async findByIdAndReplace(
    id: any,
    props: PartialDeep<T>,
    opts?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T | null> {
    return this.findOneAndReplace(
      { [this.metadata.idField.propertyName]: id },
      props,
      opts
    );
  }

  async findByIdAndReplaceOrFail(
    id: any,
    props: PartialDeep<T>,
    opts?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T> {
    return this.findOneAndReplaceOrFail(
      { [this.metadata.idField.propertyName]: id },
      props,
      opts
    );
  }

  async findOneAndDelete(
    filter: Filter<T | any>,
    opts?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<T | null> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeDelete,
      EventSubscriberMethods.AfterDelete,
      {
        meta: this.metadata,
        filter
      },
      async () => {
        const result = await this.collection.findOneAndDelete(
          this.prepareFilter(filter, opts),
          this.prepareOptions(opts)
        );

        return this.fromModifyResult(result);
      }
    );
  }

  async findOneAndDeleteOrFail(
    filter: Filter<T | any>,
    opts?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndDelete(filter, opts)
    );
  }

  async findByIdAndDelete(
    id: any,
    opts?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<T | null> {
    return this.findOneAndDelete(
      { [this.metadata.idField.propertyName]: id },
      opts
    );
  }

  async findByIdAndDeleteOrFail(
    id: any,
    opts?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<T | null> {
    return this.findOneAndDeleteOrFail(
      { [this.metadata.idField.propertyName]: id },
      opts
    );
  }

  async updateOne(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeUpdate,
      EventSubscriberMethods.AfterUpdate,
      {
        meta: this.metadata,
        filter,
        update
      },
      () =>
        this.collection.updateOne(
          this.prepareFilter(filter, opts),
          update,
          this.prepareOptions(opts)
        ) as Promise<UpdateResult>
    );
  }

  async updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: WithInternalOptions<UpdateOptions>
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
    opts?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeUpdateMany,
      EventSubscriberMethods.AfterUpdateMany,
      {
        meta: this.metadata,
        filter,
        update
      },
      () =>
        this.collection.updateMany(
          this.prepareFilter(filter, opts),
          update,
          this.prepareOptions(opts)
        ) as Promise<UpdateResult>
    );
  }

  async updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.updateMany(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      update,
      opts
    );
  }

  async replaceOne(
    filter: Filter<T | any>,
    props: PartialDeep<T>,
    opts?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    const model =
      props instanceof this.metadata.DocumentClass ? props : this.init(props);

    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeReplace,
      EventSubscriberMethods.AfterReplace,
      {
        meta: this.metadata,
        filter,
        model
      },
      async () => {
        const doc = this.toDB(model);
        delete doc._id;

        return (await this.collection.replaceOne(
          this.prepareFilter(filter, opts),
          doc,
          this.prepareOptions(opts)
        )) as UpdateResult;
      }
    );
  }

  async replaceById(
    id: any,
    props: PartialDeep<T>,
    opts?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.replaceOne(
      { [this.metadata.idField.propertyName]: id },
      props,
      opts
    );
  }

  async deleteOne(
    filter: Filter<T | any>,
    opts?: WithInternalOptions<DeleteOptions>
  ): Promise<boolean> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeDelete,
      EventSubscriberMethods.AfterDelete,
      {
        meta: this.metadata,
        filter
      },
      async () => {
        const result = await this.collection.deleteOne(
          this.prepareFilter(filter, opts),
          this.prepareOptions(opts)
        );

        return result && result.deletedCount === 1;
      }
    );
  }

  async deleteById(
    id: any,
    opts?: WithInternalOptions<DeleteOptions>
  ): Promise<boolean> {
    return this.deleteOne({ [this.metadata.idField.propertyName]: id }, opts);
  }

  async deleteMany(
    filter: Filter<T | any>,
    opts?: WithInternalOptions<DeleteOptions>
  ): Promise<DeleteResult> {
    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeDeleteMany,
      EventSubscriberMethods.AfterDeleteMany,
      {
        meta: this.metadata,
        filter
      },
      () =>
        this.collection.deleteMany(
          this.prepareFilter(filter, opts),
          this.prepareOptions(opts)
        )
    );
  }

  async deleteByIds(
    ids: any[],
    opts?: WithInternalOptions<DeleteOptions>
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

  prepareFilter(
    filter: Filter<T | any>,
    opts?: WithInternalOptions | Record<any, any>
  ): Filter<any> {
    const transformQueryFilter = (opts || {}).transformQueryFilter ?? true;

    return transformQueryFilter
      ? this.metadata.transformQueryFilter(filter)
      : filter;
  }

  prepareOptions<T = any>(opts?: T): T {
    if (typeof opts !== 'object') {
      return opts;
    }

    // remove unwanted options
    if ('transformQueryFilter' in opts) {
      delete (opts as InternalOptions).transformQueryFilter;
    }

    return opts;
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

  protected fromModifyResult(result: ModifyResult<T>): T | null {
    return result && result.ok && result.value
      ? this.fromDB(result.value)
      : null;
  }
}
