import { Cursor } from 'mongodb';
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
  CollectionInsertManyOptions
} from '../typings';
import { DocumentMetadata } from '../metadata/DocumentMetadata';
import { ValidationError } from '../errors';
import { DocumentManager } from '../DocumentManager';
import {
  FindOneOptions,
  FindOneAndUpdateOption,
  FindOneAndReplaceOption,
  FindOneAndDeleteOption,
  UpdateWriteOpResult,
  ReplaceWriteOpResult,
  DeleteWriteOpResultObject
} from 'mongodb';
import { Type } from '../types';

/**
 * Repository for documents
 */
export abstract class AbstractRepository<T> {
  abstract get manager(): DocumentManager;
  abstract get metadata(): DocumentMetadata<T>;

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
   * Gets the _id field's type
   */
  get id(): Type {
    return this.metadata.idField.type;
  }

  init(props: Partial<T>): T {
    return this.metadata.init(props);
  }

  merge(model: T, props: Partial<T>): T {
    return this.metadata.merge(model, props);
  }

  toDB(model: Partial<T> | { [key: string]: any }): Partial<T> {
    return this.metadata.toDB(model);
  }

  fromDB(doc: Partial<T>): T {
    return this.metadata.fromDB(doc);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected failIfEmpty(
    meta: DocumentMetadata<T>,
    filter: FilterQuery<any>,
    value: any
  ) {
    if (!value) {
      ValidationError.documentNotFound(meta, filter);
    }

    return value;
  }

  // -------------------------------------------------------------------------
  // Abstract Methods
  // -------------------------------------------------------------------------

  abstract find(query?: FilterQuery<T | any>): Cursor<T>;
  abstract find(
    query: FilterQuery<T | any>,
    opts: FindOneOptions<T>
  ): Cursor<T>;
  abstract find(
    query: FilterQuery<T | any>,
    opts?: FindOneOptions<T>
  ): Cursor<T>;

  abstract findByIds(ids: any[]): Cursor<T>;
  abstract findByIds(ids: any[], opts: FindOneOptions<T>): Cursor<T>;
  abstract findByIds(ids: any[], opts?: FindOneOptions<T>): Cursor<T>;

  abstract findById(id: any, opts?: FindOneOptions<T>): Promise<T | null>;

  abstract findByIdOrFail(id: any, opts?: FindOneOptions<T>): Promise<T>;

  abstract findOne(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions<T>
  ): Promise<T | null>;

  abstract findOneOrFail(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions<T>
  ): Promise<T | null>;

  abstract create(
    props: Partial<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<T>;
  abstract create(
    props: Partial<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<T[]>;
  abstract create(
    props: Partial<T> | Partial<T>[],
    opts?: CollectionInsertOneOptions | CollectionInsertManyOptions
  ): Promise<T | T[]>;

  abstract createOne(
    props: Partial<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<T>;

  abstract createMany(
    props: Partial<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<T[]>;

  abstract insertOne(
    model: OptionalId<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<InsertOneWriteOpResult<any>>;

  abstract insertMany(
    models: OptionalId<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<InsertWriteOpResult<any>>;

  abstract findOneAndUpdate(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption<T>
  ): Promise<T | null>;

  abstract findOneAndUpdateOrFail(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption<T>
  ): Promise<T>;

  abstract findByIdAndUpdate(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption<T>
  ): Promise<T | null>;

  abstract findByIdAndUpdateOrFail(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption<T>
  ): Promise<T>;

  abstract findOneAndReplace(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption<T>
  ): Promise<T | null>;

  abstract findOneAndReplaceOrFail(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption<T>
  ): Promise<T>;

  abstract findByIdAndReplace(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption<T>
  ): Promise<T | null>;

  abstract findByIdAndReplaceOrFail(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption<T>
  ): Promise<T>;

  abstract findOneAndDelete(
    filter: FilterQuery<T | any>,
    opts?: FindOneAndDeleteOption<T>
  ): Promise<T | null>;

  abstract findOneAndDeleteOrFail(
    filter: FilterQuery<T | any>,
    opts?: FindOneAndDeleteOption<T>
  ): Promise<T>;

  abstract findByIdAndDelete(
    id: any,
    opts?: FindOneAndDeleteOption<T>
  ): Promise<T | null>;

  abstract findByIdAndDeleteOrFail(
    id: any,
    opts?: FindOneAndDeleteOption<T>
  ): Promise<T | null>;

  abstract updateOne(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult>;

  abstract updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult>;

  abstract updateMany(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult>;

  abstract updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult>;

  abstract replaceOne(
    filter: FilterQuery<T | any>,
    props: Partial<T>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult>;

  abstract replaceById(
    id: any,
    props: Partial<T>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult>;

  abstract deleteOne(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean>;

  abstract deleteById(
    id: any,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean>;

  abstract deleteMany(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject>;

  abstract deleteByIds(
    ids: any[],
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject>;
}
