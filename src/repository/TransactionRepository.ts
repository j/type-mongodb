import {
  ClientSession,
  Filter,
  FindCursor,
  FindOptions,
  InsertOneOptions,
  BulkWriteOptions,
  InsertOneResult,
  InsertManyResult,
  FindOneAndUpdateOptions,
  FindOneAndReplaceOptions,
  FindOneAndDeleteOptions,
  UpdateOptions,
  UpdateResult,
  DeleteOptions,
  DeleteResult,
  OptionalId,
  UpdateQuery
} from 'mongodb';
import { Repository } from './Repository';
import { DocumentManager } from '../DocumentManager';
import { DocumentMetadata } from '../metadata';
import {
  AbstractRepository,
  TransformQueryFilterOptions
} from './AbstractRepository';

/**
 * Repository for documents
 */
export class TransactionRepository<T> extends AbstractRepository<T> {
  constructor(
    protected repository: Repository<T>,
    protected session: ClientSession
  ) {
    super();
  }

  get manager(): DocumentManager {
    return this.repository.manager;
  }

  get metadata(): DocumentMetadata<T> {
    return this.repository.metadata;
  }

  find(query?: Filter<T | any>): FindCursor<T>;
  find(query: Filter<T | any>, opts: FindOptions): FindCursor<T>;
  find(query: Filter<T | any>, opts?: FindOptions): FindCursor<T> {
    return this.repository.find(query, this.opts(opts));
  }

  findByIds(ids: any[]): FindCursor<T>;
  findByIds(ids: any[], opts: FindOptions): FindCursor<T>;
  findByIds(ids: any[], opts?: FindOptions): FindCursor<T> {
    return this.repository.findByIds(ids, this.opts(opts));
  }

  async findById(id: any, opts?: FindOptions): Promise<T | null> {
    return this.repository.findById(id, this.opts(opts));
  }

  async findByIdOrFail(id: any, opts?: FindOptions): Promise<T> {
    return this.repository.findByIdOrFail(id, this.opts(opts));
  }

  async findOne(
    filter: Filter<T | any>,
    opts?: FindOptions
  ): Promise<T | null> {
    return this.repository.findOne(filter, this.opts(opts));
  }

  async findOneOrFail(
    filter: Filter<T | any>,
    opts?: FindOptions
  ): Promise<T | null> {
    return this.repository.findOneOrFail(filter, this.opts(opts));
  }

  create(props: Partial<T>, opts?: InsertOneOptions): Promise<T>;
  create(props: Partial<T>[], opts?: BulkWriteOptions): Promise<T[]>;
  async create(
    props: Partial<T> | Partial<T>[],
    opts?: InsertOneOptions | BulkWriteOptions
  ): Promise<T | T[]> {
    return this.repository.create(props as any, this.opts(opts));
  }

  async createOne(props: Partial<T>, opts?: InsertOneOptions): Promise<T> {
    return this.repository.createOne(props, this.opts(opts));
  }

  async createMany(props: Partial<T>[], opts?: BulkWriteOptions): Promise<T[]> {
    return this.repository.createMany(props, this.opts(opts));
  }

  async insertOne(
    model: OptionalId<T>,
    opts?: InsertOneOptions
  ): Promise<InsertOneResult<any>> {
    return this.repository.insertOne(model, this.opts(opts));
  }

  async insertMany(
    models: OptionalId<T>[],
    opts?: BulkWriteOptions
  ): Promise<InsertManyResult<T>> {
    return this.repository.insertMany(models, this.opts(opts));
  }

  async findOneAndUpdate(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findOneAndUpdate(filter, update, this.opts(opts));
  }

  async findOneAndUpdateOrFail(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.repository.findOneAndUpdateOrFail(filter, update, opts);
  }

  async findByIdAndUpdate(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findByIdAndUpdate(id, update, this.opts(opts));
  }

  async findByIdAndUpdateOrFail(
    id: any,
    update: UpdateQuery<T>,
    opts?: FindOneAndUpdateOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.repository.findOneAndUpdateOrFail(id, update, this.opts(opts));
  }

  async findOneAndReplace(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findOneAndReplace(filter, props, this.opts(opts));
  }

  async findOneAndReplaceOrFail(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.repository.findOneAndReplaceOrFail(
      filter,
      props,
      this.opts(opts)
    );
  }

  async findByIdAndReplace(
    id: any,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findByIdAndReplace(id, props, this.opts(opts));
  }

  async findByIdAndReplaceOrFail(
    id: any,
    props: Partial<T>,
    opts?: FindOneAndReplaceOptions & TransformQueryFilterOptions
  ): Promise<T> {
    return this.repository.findByIdAndReplaceOrFail(id, props, this.opts(opts));
  }

  async findOneAndDelete(
    filter: Filter<T | any>,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findOneAndDelete(filter, this.opts(opts));
  }

  async findOneAndDeleteOrFail(
    filter: Filter<T | any>,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findOneAndDeleteOrFail(filter, this.opts(opts));
  }

  async findByIdAndDelete(
    id: any,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findByIdAndDelete(id, this.opts(opts));
  }

  async findByIdAndDeleteOrFail(
    id: any,
    opts?: FindOneAndDeleteOptions & TransformQueryFilterOptions
  ): Promise<T | null> {
    return this.repository.findByIdAndDeleteOrFail(id, this.opts(opts));
  }

  async updateOne(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.repository.updateOne(filter, update, this.opts(opts));
  }

  async updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.repository.updateById(id, update, this.opts(opts));
  }

  async updateMany(
    filter: Filter<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.repository.updateMany(filter, update, this.opts(opts));
  }

  async updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.repository.updateByIds(ids, update, this.opts(opts));
  }

  async replaceOne(
    filter: Filter<T | any>,
    props: Partial<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.repository.replaceOne(filter, props, this.opts(opts));
  }

  async replaceById(
    id: any,
    props: Partial<T>,
    opts?: UpdateOptions & TransformQueryFilterOptions
  ): Promise<UpdateResult> {
    return this.repository.replaceById(id, props, this.opts(opts));
  }

  async deleteOne(
    filter: Filter<T | any>,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<boolean> {
    return this.repository.deleteOne(filter, this.opts(opts));
  }

  async deleteById(
    id: any,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<boolean> {
    return this.repository.deleteById(id, this.opts(opts));
  }

  async deleteMany(
    filter: Filter<T | any>,
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<DeleteResult> {
    return this.repository.deleteMany(filter, this.opts(opts));
  }

  async deleteByIds(
    ids: any[],
    opts?: DeleteOptions & TransformQueryFilterOptions
  ): Promise<DeleteResult> {
    return this.repository.deleteByIds(ids, this.opts(opts));
  }

  private opts<T extends Object>(opts: T): T & { session: ClientSession } {
    return { ...opts, session: this.session };
  }
}
