import {
  BulkWriteOptions,
  Collection,
  Db,
  DeleteOptions,
  DeleteResult,
  Document,
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
  UpdateFilter,
  UpdateResult
} from 'mongodb';
import { DocumentMetadata } from '../metadata';
import { InternalError, ValidationError } from '../errors';
import { DocumentManager } from '../DocumentManager';
import { EventSubscriberMethods, InsertManyEvent } from '../events';
import { Type } from '../types';
import { Mutable, PartialDeep } from '../typings';
import { CastInput, CastType } from '../utils';

/**
 * `type-mongodb` specific options
 */
export interface InternalOptions {
  disableCasting?: boolean;
}

export type WithInternalOptions<T extends Record<any, any> = Record<any, any>> =
  T & InternalOptions;

/**
 * Repository for documents
 */
export class Repository<T = any> {
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
  get collection(): Collection<T & Document> {
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

  /**
   * Creates a model from it's properties.
   */
  init(props: PartialDeep<T>): T {
    return this.metadata.init(props);
  }

  /**
   * Merges the properties into the given model.
   */
  merge(model: T, props: PartialDeep<T>): T {
    return this.metadata.merge(model, props);
  }

  /**
   * Converts the model to a plain object.
   */
  toObject(model: T): OptionalId<any> {
    return this.metadata.toObject(model);
  }

  /**
   * Converts the model fields to a mongodb document.
   */
  toDB(model: T): OptionalId<any> {
    return this.metadata.toDB(model);
  }

  /**
   * Creates a model from a document.
   */
  fromDB(doc: T): T {
    return this.metadata.fromDB(doc);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------
  find(filter?: Filter<T | any>): FindCursor<T>;
  find(
    filter: Filter<T | any>,
    options: WithInternalOptions<FindOptions>
  ): FindCursor<T>;
  find(
    filter: Filter<T | any>,
    options?: WithInternalOptions<FindOptions>
  ): FindCursor<T> {
    const cursor = this.collection.find(
      this.castFilter(filter, options) || {},
      this.castOptions(options)
    );
    cursor.map((doc: any) => this.fromDB(doc));

    return cursor;
  }

  findByIds(ids: any[]): FindCursor<T>;
  findByIds(
    ids: any[],
    options: WithInternalOptions<FindOptions>
  ): FindCursor<T>;
  findByIds(
    ids: any[],
    options?: WithInternalOptions<FindOptions>
  ): FindCursor<T> {
    return this.find(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      options
    );
  }

  async findById(
    id: any,
    options?: WithInternalOptions<FindOptions>
  ): Promise<T | null> {
    return this.findOne({ [this.metadata.idField.propertyName]: id }, options);
  }

  async findByIdOrFail(
    id: any,
    options?: WithInternalOptions<FindOptions>
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      { [this.metadata.idField.propertyName]: id },
      await this.findById(id, options)
    );
  }

  async findOne(
    filter: Filter<T | any>,
    options?: WithInternalOptions<FindOptions>
  ): Promise<T | null> {
    const found = await this.collection.findOne(
      this.castFilter(filter, options) || {},
      this.castOptions(options)
    );

    return found ? this.fromDB(found) : null;
  }

  async findOneOrFail(
    filter: Filter<T | any>,
    options?: WithInternalOptions<FindOptions>
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOne(filter, options)
    );
  }

  create(props: PartialDeep<T>, options?: InsertOneOptions): Promise<T>;
  create(props: PartialDeep<T>[], options?: BulkWriteOptions): Promise<T[]>;
  async create(
    props: PartialDeep<T> | PartialDeep<T>[],
    options?: InsertOneOptions | BulkWriteOptions
  ): Promise<T | T[]> {
    return Array.isArray(props)
      ? this.createMany(props, options)
      : this.createOne(props, options);
  }

  async createOne(
    props: PartialDeep<T>,
    options?: InsertOneOptions
  ): Promise<T> {
    const model = this.init(props);
    const { acknowledged } = await this.insertOne(model, options);

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
    options?: InsertOneOptions
  ): Promise<InsertOneResult<any>> {
    const doc = this.toDB(model);

    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeInsert,
      EventSubscriberMethods.AfterInsert,
      {
        meta: this.metadata,
        model
      },
      () => {
        return this.collection.insertOne(doc, this.castOptions(options));
      }
    );
  }

  async insertMany(
    models: T[],
    options?: BulkWriteOptions
  ): Promise<InsertManyResult<T>> {
    const docs: OptionalId<T>[] = models.map((model) => this.toDB(model));

    const event: InsertManyEvent = {
      meta: this.metadata,
      models: models
    };

    return this.manager.eventManager.dispatchBeforeAndAfter(
      EventSubscriberMethods.BeforeInsertMany,
      EventSubscriberMethods.AfterInsertMany,
      event,
      () => {
        return this.collection.insertMany(docs, this.castOptions(options));
      }
    );
  }

  async findOneAndUpdate(
    filter: Filter<T | any>,
    update: UpdateFilter<T>,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
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
          this.castFilter(filter, options),
          this.castUpdateFilter(update, options),
          this.castOptions(options)
        );

        return this.fromModifyResult(result);
      }
    );
  }

  async findOneAndUpdateOrFail(
    filter: Filter<T | any>,
    update: UpdateFilter<T>,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndUpdate(filter, update, options)
    );
  }

  async findByIdAndUpdate(
    id: any,
    update: UpdateFilter<T>,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<T | null> {
    return this.findOneAndUpdate(
      { [this.metadata.idField.propertyName]: id },
      update,
      options
    );
  }

  async findByIdAndUpdateOrFail(
    id: any,
    update: UpdateFilter<T>,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<T> {
    return this.findOneAndUpdateOrFail(
      { [this.metadata.idField.propertyName]: id },
      update,
      options
    );
  }

  async findOneAndReplace(
    filter: Filter<T | any>,
    model: T,
    options?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T | null> {
    const result = await this.collection.findOneAndReplace(
      this.castFilter(filter, options),
      this.toDB(model),
      this.castOptions(options)
    );

    return this.fromModifyResult(result);
  }

  async findOneAndReplaceOrFail(
    filter: Filter<T | any>,
    model: T,
    opts?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndReplace(filter, model, opts)
    );
  }

  async findByIdAndReplace(
    id: any,
    model: T,
    options?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T | null> {
    return this.findOneAndReplace(
      { [this.metadata.idField.propertyName]: id },
      model,
      options
    );
  }

  async findByIdAndReplaceOrFail(
    id: any,
    model: T,
    options?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<T> {
    return this.findOneAndReplaceOrFail(
      { [this.metadata.idField.propertyName]: id },
      model,
      options
    );
  }

  async findOneAndDelete(
    filter: Filter<T | any>,
    options?: WithInternalOptions<FindOneAndDeleteOptions>
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
          this.castFilter(filter, options),
          this.castOptions(options)
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
    options?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<T | null> {
    return this.findOneAndDelete(
      { [this.metadata.idField.propertyName]: id },
      options
    );
  }

  async findByIdAndDeleteOrFail(
    id: any,
    options?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<T> {
    return this.findOneAndDeleteOrFail(
      { [this.metadata.idField.propertyName]: id },
      options
    );
  }

  async updateOne(
    filter: Filter<T | any>,
    update: UpdateFilter<T>,
    options?: WithInternalOptions<UpdateOptions>
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
          this.castFilter(filter, options),
          this.castUpdateFilter(update, options),
          this.castOptions(options)
        ) as Promise<UpdateResult>
    );
  }

  async updateById(
    id: any,
    update: UpdateFilter<T>,
    options?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.updateOne(
      { [this.metadata.idField.propertyName]: id },
      update,
      options
    );
  }

  async updateMany(
    filter: Filter<T | any>,
    update: UpdateFilter<T>,
    options?: WithInternalOptions<UpdateOptions>
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
          this.castFilter(filter, options),
          this.castUpdateFilter(update, options),
          this.castOptions(options)
        ) as Promise<UpdateResult>
    );
  }

  async updateByIds(
    ids: any[],
    update: UpdateFilter<T>,
    options?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.updateMany(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      update,
      options
    );
  }

  async replaceOne(
    filter: Filter<T | any>,
    props: PartialDeep<T>,
    options?: WithInternalOptions<UpdateOptions>
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
        if (this.metadata.idField.propertyName in doc) {
          delete doc[this.metadata.idField.propertyName];
        }

        return (await this.collection.replaceOne(
          this.castFilter(filter, options),
          doc,
          this.castOptions(options)
        )) as UpdateResult;
      }
    );
  }

  async replaceById(
    id: any,
    props: PartialDeep<T>,
    options?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.replaceOne(
      { [this.metadata.idField.propertyName]: id },
      props,
      options
    );
  }

  async deleteOne(
    filter: Filter<T | any>,
    options?: WithInternalOptions<DeleteOptions>
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
          this.castFilter(filter, options),
          this.castOptions(options)
        );

        return result && result.deletedCount === 1;
      }
    );
  }

  async deleteById(
    id: any,
    options?: WithInternalOptions<DeleteOptions>
  ): Promise<boolean> {
    return this.deleteOne(
      { [this.metadata.idField.propertyName]: id },
      options
    );
  }

  async deleteMany(
    filter: Filter<T | any>,
    options?: WithInternalOptions<DeleteOptions>
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
          this.castFilter(filter, options),
          this.castOptions(options)
        )
    );
  }

  async deleteByIds(
    ids: any[],
    options?: WithInternalOptions<DeleteOptions>
  ): Promise<DeleteResult> {
    return this.deleteMany(
      {
        [this.metadata.idField.propertyName]: { $in: ids }
      },
      options
    );
  }

  /**
   * Casts the fields & values to MongoDB filters.
   */
  castFilter(
    filter: Filter<T | any>,
    options?: InternalOptions
  ): Filter<T | any> {
    return this.cast(filter, 'filter', options);
  }

  /**
   * Casts the fields & values to MongoDB update queries.
   */
  castUpdateFilter(
    update: UpdateFilter<T | any>,
    options?: InternalOptions
  ): Filter<T | any> {
    return this.cast(update, 'update', options);
  }

  /**
   * Casts the fields & values to MongoDB filters or update queries.
   */
  cast<I extends CastInput<T>>(
    input: I,
    type: CastType,
    options?: InternalOptions
  ): I {
    const disableCasting = (options || {}).disableCasting === true;
    if (disableCasting) {
      return input;
    }

    return this.metadata.cast(input, type);
  }

  castOptions<T = any>(opts?: T): T {
    if (typeof opts !== 'object') {
      return opts;
    }

    const options = { ...opts };

    // remove unwanted options
    if ('disableCasting' in options) {
      delete (options as InternalOptions).disableCasting;
    }

    return options;
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
