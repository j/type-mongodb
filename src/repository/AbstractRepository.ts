import { Cursor, ObjectId } from 'mongodb';
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
import {
  FindOneOptions,
  FindOneAndUpdateOption,
  FindOneAndReplaceOption,
  FindOneAndDeleteOption,
  UpdateWriteOpResult,
  ReplaceWriteOpResult,
  DeleteWriteOpResultObject,
} from 'mongodb';

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

  // -------------------------------------------------------------------------
  // Abstract Methods
  // -------------------------------------------------------------------------

  abstract find(query?: FilterQuery<T | any>): Cursor<T>;
  abstract find(query: FilterQuery<T | any>, opts: FindOneOptions): Cursor<T>;
  abstract find(query: FilterQuery<T | any>, opts?: FindOneOptions): Cursor<T>;

  abstract findByIds(ids: any[]): Cursor<T>;
  abstract findByIds(ids: any[], opts: FindOneOptions): Cursor<T>;
  abstract findByIds(ids: any[], opts?: FindOneOptions): Cursor<T>;

  abstract async findById(id: any, opts?: FindOneOptions): Promise<T | null>;

  abstract async findByIdOrFail(id: any, opts?: FindOneOptions): Promise<T>;

  abstract async findOne(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions
  ): Promise<T | null>;

  abstract async findOneOrFail(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions
  ): Promise<T | null>;

  abstract create(
    props: Partial<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<T>;
  abstract create(
    props: Partial<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<T[]>;
  abstract async create(
    props: Partial<T> | Partial<T>[],
    opts?: CollectionInsertOneOptions | CollectionInsertManyOptions
  ): Promise<T | T[]>;

  abstract async createOne(
    props: Partial<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<T>;

  abstract async createMany(
    props: Partial<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<T[]>;

  abstract async insertOne(
    model: OptionalId<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<InsertOneWriteOpResult<any>>;

  abstract async insertMany(
    models: OptionalId<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<InsertWriteOpResult<any>>;

  abstract async findOneAndUpdate(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption
  ): Promise<T | null>;

  abstract async findOneAndUpdateOrFail(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption
  ): Promise<T>;

  abstract async findByIdAndUpdate(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption
  ): Promise<T | null>;

  abstract async findByIdAndUpdateOrFail(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOption
  ): Promise<T>;

  abstract async findOneAndReplace(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T | null>;

  abstract async findOneAndReplaceOrFail(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T>;

  abstract async findByIdAndReplace(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T | null>;

  abstract async findByIdAndReplaceOrFail(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T>;

  abstract async findOneAndDelete(
    filter: FilterQuery<T | any>,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null>;

  abstract async findOneAndDeleteOrFail(
    filter: FilterQuery<T | any>,
    opts?: FindOneAndDeleteOption
  ): Promise<T>;

  abstract async findByIdAndDelete(
    id: any,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null>;

  abstract async findByIdAndDeleteOrFail(
    id: any,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null>;

  abstract async updateOne(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult>;

  abstract async updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult>;

  abstract async updateMany(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult>;

  abstract async updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult>;

  abstract async replaceOne(
    filter: FilterQuery<T | any>,
    props: Partial<T>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult>;

  abstract async replaceById(
    id: any,
    props: Partial<T>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult>;

  abstract async deleteOne(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean>;

  abstract async deleteById(
    id: any,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean>;

  abstract async deleteMany(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject>;

  abstract async deleteByIds(
    ids: any[],
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject>;
}
