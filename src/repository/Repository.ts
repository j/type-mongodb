import {
  BulkWriteOptions,
  Collection,
  Db,
  DeleteOptions,
  DeleteResult,
  FindCursor,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOptions,
  InsertManyResult,
  InsertOneOptions,
  InsertOneResult,
  UpdateOptions,
  UpdateResult,
  WithId,
  OptionalUnlessRequiredId,
  ModifyResult
} from 'mongodb';
import { DocumentMetadata } from '../metadata';
import { InternalError, ValidationError } from '../errors';
import { DocumentManager } from '../DocumentManager';
import { EventSubscriberMethods, InsertManyEvent } from '../events';
import { Type } from '../types';
import {
  Mutable,
  PartialDeep,
  WithDocumentFields,
  Filter,
  UpdateFilter
} from '../typings';
import { CastInput, CastType } from '../utils';

/**
 * `type-mongodb` specific options
 */
export interface InternalOptions {
  disableCasting?: boolean;
}

export type WithInternalOptions<T extends Record<string, any>> = T &
  InternalOptions;

/**
 * Repository for documents
 */
export class Repository<
  Model extends Record<string, any> = any,
  Document = WithDocumentFields<Model>
> {
  public readonly metadata: DocumentMetadata<Model, Document>;

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
  get collection(): Collection<Document> {
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
  setDocumentMetadata(metadata: DocumentMetadata<Model, Document>): void {
    if (typeof this.metadata !== 'undefined') {
      InternalError.throw(
        `Repository for "${this.metadata.name}" already has "metadata"`
      );
    }

    (this as Mutable<Repository<Model, Document>>).metadata = metadata;
  }

  /**
   * Creates a model from it's properties.
   */
  init(props: PartialDeep<Model>): Model {
    return this.metadata.init(props);
  }

  /**
   * Merges the properties into the given model.
   */
  merge(model: Model, props: PartialDeep<Model>): Model {
    return this.metadata.merge(model, props);
  }

  /**
   * Converts the model to a plain object.
   */
  toObject(model: Model): any {
    return this.metadata.toObject(model);
  }

  /**
   * Converts the model fields to a mongodb document.
   */
  toDB(model: Model): OptionalUnlessRequiredId<Document> {
    return this.metadata.toDB(model);
  }

  /**
   * Creates a model from a document.
   */
  fromDB(doc: WithId<Document>): Model {
    return this.metadata.fromDB(doc);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------
  find<F = Filter<Model>>(filter?: F): FindCursor<Model>;
  find<F = Filter<Model>>(
    filter: F,
    options: WithInternalOptions<FindOptions>
  ): FindCursor<Model>;
  find<F = Filter<Model>>(
    filter: F,
    options?: WithInternalOptions<FindOptions>
  ): FindCursor<Model> {
    return this.collection
      .find(this.castFilter(filter, options) || {}, this.castOptions(options))
      .map((doc: any) => this.fromDB(doc));
  }

  findByIds(ids: any[]): FindCursor<Model>;
  findByIds(
    ids: any[],
    options: WithInternalOptions<FindOptions>
  ): FindCursor<Model>;
  findByIds(
    ids: any[],
    options?: WithInternalOptions<FindOptions>
  ): FindCursor<Model> {
    return this.find(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      options
    );
  }

  async findById(
    id: any,
    options?: WithInternalOptions<FindOptions>
  ): Promise<Model | null> {
    return this.findOne({ [this.metadata.idField.propertyName]: id }, options);
  }

  async findByIdOrFail(
    id: any,
    options?: WithInternalOptions<FindOptions>
  ): Promise<Model> {
    return this.failIfEmpty(
      this.metadata,
      { [this.metadata.idField.propertyName]: id },
      await this.findById(id, options)
    );
  }

  async findOne<F = Filter<Model>>(
    filter: F,
    options?: WithInternalOptions<FindOptions>
  ): Promise<Model | null> {
    const found = await this.collection.findOne(
      this.castFilter(filter, options) || {},
      this.castOptions(options)
    );

    return found ? this.fromDB(found) : null;
  }

  async findOneOrFail<F = Filter<Model>>(
    filter: F,
    options?: WithInternalOptions<FindOptions>
  ): Promise<Model> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOne(filter, options)
    );
  }

  create(props: PartialDeep<Model>, options?: InsertOneOptions): Promise<Model>;
  create(
    props: PartialDeep<Model>[],
    options?: BulkWriteOptions
  ): Promise<Model[]>;
  async create(
    props: PartialDeep<Model> | PartialDeep<Model>[],
    options?: InsertOneOptions | BulkWriteOptions
  ): Promise<Model | Model[]> {
    return Array.isArray(props)
      ? this.createMany(props, options)
      : this.createOne(props, options);
  }

  async createOne(
    props: PartialDeep<Model>,
    options?: InsertOneOptions
  ): Promise<Model> {
    const model = this.init(props);
    const { acknowledged } = await this.insertOne(model, options);

    return acknowledged ? model : null;
  }

  async createMany(
    props: PartialDeep<Model>[],
    opts?: BulkWriteOptions
  ): Promise<Model[]> {
    const models = props.map((p) => this.init(p));
    const { insertedIds } = await this.insertMany(models, opts);

    return Object.keys(insertedIds).map((i) => models[i]);
  }

  async insertOne(
    model: Model,
    options?: InsertOneOptions
  ): Promise<InsertOneResult<Document>> {
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
    models: Model[],
    options?: BulkWriteOptions
  ): Promise<InsertManyResult<Document>> {
    const docs = models.map((model) => this.toDB(model));

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

  async findOneAndUpdate<F = Filter<Model>, U = UpdateFilter<Model>>(
    filter: F,
    update: U,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<Model | null> {
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

  async findOneAndUpdateOrFail<F = Filter<Model>, U = UpdateFilter<Model>>(
    filter: F,
    update: U,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<Model> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndUpdate(filter, update, options)
    );
  }

  async findByIdAndUpdate<U = UpdateFilter<Model>>(
    id: any,
    update: U,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<Model | null> {
    return this.findOneAndUpdate(
      { [this.metadata.idField.propertyName]: id },
      update,
      options
    );
  }

  async findByIdAndUpdateOrFail<U = UpdateFilter<Model>>(
    id: any,
    update: U,
    options?: WithInternalOptions<FindOneAndUpdateOptions>
  ): Promise<Model> {
    return this.findOneAndUpdateOrFail(
      { [this.metadata.idField.propertyName]: id },
      update,
      options
    );
  }

  async findOneAndReplace<F = Filter<Model>>(
    filter: F,
    model: Model,
    options?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<Model | null> {
    const result = await this.collection.findOneAndReplace(
      this.castFilter(filter, options),
      this.toDB(model),
      this.castOptions(options)
    );

    return this.fromModifyResult(result);
  }

  async findOneAndReplaceOrFail<F = Filter<Model>>(
    filter: F,
    model: Model,
    opts?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<Model> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndReplace(filter, model, opts)
    );
  }

  async findByIdAndReplace(
    id: any,
    model: Model,
    options?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<Model | null> {
    return this.findOneAndReplace(
      { [this.metadata.idField.propertyName]: id },
      model,
      options
    );
  }

  async findByIdAndReplaceOrFail(
    id: any,
    model: Model,
    options?: WithInternalOptions<FindOneAndReplaceOptions>
  ): Promise<Model> {
    return this.findOneAndReplaceOrFail(
      { [this.metadata.idField.propertyName]: id },
      model,
      options
    );
  }

  async findOneAndDelete<F = Filter<Model>>(
    filter: F,
    options?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<Model | null> {
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

  async findOneAndDeleteOrFail<F = Filter<Model>>(
    filter: F,
    opts?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<Model> {
    return this.failIfEmpty(
      this.metadata,
      filter,
      await this.findOneAndDelete(filter, opts)
    );
  }

  async findByIdAndDelete(
    id: any,
    options?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<Model | null> {
    return this.findOneAndDelete(
      { [this.metadata.idField.propertyName]: id },
      options
    );
  }

  async findByIdAndDeleteOrFail(
    id: any,
    options?: WithInternalOptions<FindOneAndDeleteOptions>
  ): Promise<Model> {
    return this.findOneAndDeleteOrFail(
      { [this.metadata.idField.propertyName]: id },
      options
    );
  }

  async updateOne<F = Filter<Model>, U = UpdateFilter<Model>>(
    filter: F,
    update: U,
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

  async updateById<U = UpdateFilter<Model>>(
    id: any,
    update: U,
    options?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.updateOne(
      { [this.metadata.idField.propertyName]: id },
      update,
      options
    );
  }

  async updateMany<F = Filter<Model>, U = UpdateFilter<Model>>(
    filter: F,
    update: U,
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

  async updateByIds<U = UpdateFilter<Model>>(
    ids: any[],
    update: U,
    options?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.updateMany(
      { [this.metadata.idField.propertyName]: { $in: ids } },
      update,
      options
    );
  }

  async replaceOne<F = Filter<Model>>(
    filter: F,
    props: PartialDeep<Model>,
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
    props: PartialDeep<Model>,
    options?: WithInternalOptions<UpdateOptions>
  ): Promise<UpdateResult> {
    return this.replaceOne(
      { [this.metadata.idField.propertyName]: id },
      props,
      options
    );
  }

  async deleteOne<F = Filter<Model>>(
    filter: F,
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

  async deleteMany<F = Filter<Model>>(
    filter: F,
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
  castFilter<F = Filter<Model>>(filter: F, options?: InternalOptions): F {
    return this.cast(filter, 'filter', options);
  }

  /**
   * Casts the fields & values to MongoDB update queries.
   */
  castUpdateFilter<U = UpdateFilter<Model>>(
    update: U,
    options?: InternalOptions
  ): U {
    return this.cast(update, 'update', options);
  }

  /**
   * Casts the fields & values to MongoDB filters or update queries.
   */
  cast<I extends CastInput<Document>>(
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
    meta: DocumentMetadata<Model, Document>,
    filter: Filter<any>,
    value: any
  ) {
    if (!value) {
      ValidationError.documentNotFound(meta, filter);
    }

    return value;
  }

  protected fromModifyResult(result: ModifyResult<Document>): Model | null {
    return result && result.ok && result.value
      ? this.fromDB(result.value)
      : null;
  }
}
