import {
  Db,
  Collection,
  FindCursor,
  FindOptions,
  Filter,
  InsertOneOptions,
  BulkWriteOptions,
  OptionalId,
  InsertOneResult,
  InsertManyResult,
  UpdateQuery,
  FindOneAndUpdateOptions,
  FindOneAndReplaceOptions,
  FindOneAndDeleteOptions,
  UpdateOptions,
  UpdateResult,
  DeleteOptions,
  DeleteResult
} from 'mongodb';
import { DocumentMetadata } from '../metadata';
import { ValidationError } from '../errors';
import { DocumentManager } from '../DocumentManager';
import { Type } from '../types';

export interface TransformQueryFilterOptions {
  transformQueryFilter?: boolean;
}

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

  transformQueryFilter(
    input: Filter<T | any>,
    opts?: TransformQueryFilterOptions & Record<any, any>
  ): Filter<any> {
    if (typeof opts === 'object' && 'transformQueryFilter' in opts) {
      const transformQueryFilter = opts.transformQueryFilter;

      delete opts.transformQueryFilter;

      if (transformQueryFilter === false) {
        return input;
      }
    }

    return this.metadata.transformQueryFilter(input);
  }

  // -------------------------------------------------------------------------
  // MongoDB specific methods
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Abstract Methods
  // -------------------------------------------------------------------------

  abstract find(query?: Filter<T | any>): FindCursor<T>;
  abstract find(query: Filter<T | any>, opts: FindOptions): FindCursor<T>;
  abstract find(query: Filter<T | any>, opts?: FindOptions): FindCursor<T>;

  abstract findByIds(ids: any[]): FindCursor<T>;
  abstract findByIds(ids: any[], opts: FindOptions): FindCursor<T>;
  abstract findByIds(ids: any[], opts?: FindOptions): FindCursor<T>;

  abstract findById(id: any, opts?: FindOptions): Promise<T | null>;

  abstract findByIdOrFail(id: any, opts?: FindOptions): Promise<T>;

  abstract findOne(
    filter: Filter<T | any>,
    opts?: FindOptions
  ): Promise<T | null>;

  abstract findOneOrFail(
    filter: Filter<T | any>,
    opts?: FindOptions
  ): Promise<T | null>;

  abstract create(props: Partial<T>, opts?: InsertOneOptions): Promise<T>;
  abstract create(props: Partial<T>[], opts?: BulkWriteOptions): Promise<T[]>;
  abstract create(
    props: Partial<T> | Partial<T>[],
    opts?: InsertOneOptions | BulkWriteOptions
  ): Promise<T | T[]>;

  abstract createOne(props: Partial<T>, opts?: InsertOneOptions): Promise<T>;

  abstract createMany(
    props: Partial<T>[],
    opts?: BulkWriteOptions
  ): Promise<T[]>;

  abstract insertOne(
    model: OptionalId<T>,
    opts?: InsertOneOptions
  ): Promise<InsertOneResult<any>>;

  abstract insertMany(
    models: OptionalId<T>[],
    opts?: BulkWriteOptions
  ): Promise<InsertManyResult<T>>;

  abstract findOneAndUpdate(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract findOneAndUpdateOrFail(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T>;

  abstract findByIdAndUpdate(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract findByIdAndUpdateOrFail(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T>;

  abstract findOneAndReplace(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract findOneAndReplaceOrFail(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T>;

  abstract findByIdAndReplace(
    id: any,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract findByIdAndReplaceOrFail(
    id: any,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T>;

  abstract findOneAndDelete(
    filter: Filter<T | any>,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract findOneAndDeleteOrFail(
    filter: Filter<T | any>,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract findByIdAndDelete(
    id: any,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract findByIdAndDeleteOrFail(
    id: any,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null>;

  abstract updateOne(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult>;

  abstract updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult>;

  abstract updateMany(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult>;

  abstract updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult>;

  abstract replaceOne(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult>;

  abstract replaceById(
    id: any,
    props: Partial<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult>;

  abstract deleteOne(
    filter: Filter<T | any>,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<boolean>;

  abstract deleteById(
    id: any,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<boolean>;

  abstract deleteMany(
    filter: Filter<T | any>,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<DeleteResult>;

  abstract deleteByIds(
    ids: any[],
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<DeleteResult>;
}
