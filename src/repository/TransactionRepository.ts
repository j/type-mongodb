import {
  Cursor,
  ClientSession,
  FindOneOptions,
  FindOneAndUpdateOption,
  FindOneAndReplaceOption,
  FindOneAndDeleteOption,
  UpdateWriteOpResult,
  ReplaceWriteOpResult,
  DeleteWriteOpResultObject
} from 'mongodb';
import {
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
} from '../types';
import { Repository } from './Repository';
import { DocumentManager } from '../DocumentManager';
import { DocumentMetadata } from '../metadata/DocumentMetadata';
import { AbstractRepository } from './AbstractRepository';

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

  find(query?: FilterQuery<T | any>, opts: FindOneOptions = {}): Cursor<T> {
    return this.repository.find(query, this.opts(opts));
  }

  findByIds(ids: any[], opts?: FindOneOptions): Cursor<T> {
    return this.repository.findByIds(ids, this.opts(opts));
  }

  async findById(id: any, opts?: FindOneOptions): Promise<T | null> {
    return this.repository.findById(id, this.opts(opts));
  }

  async findByIdOrFail(id: any, opts?: FindOneOptions): Promise<T> {
    return this.repository.findByIdOrFail(id, this.opts(opts));
  }

  async findOne(
    filter: FilterQuery<T | any>,
    opts: FindOneOptions = {}
  ): Promise<T | null> {
    return this.repository.findOne(filter, this.opts(opts));
  }

  async findOneOrFail(
    filter: FilterQuery<T | any>,
    opts?: FindOneOptions
  ): Promise<T | null> {
    return this.repository.findOneOrFail(filter, this.opts(opts));
  }

  create(props: Partial<T>, opts?: CollectionInsertOneOptions): Promise<T>;
  create(props: Partial<T>[], opts?: CollectionInsertManyOptions): Promise<T[]>;
  async create(
    props: Partial<T> | Partial<T>[],
    opts?: CollectionInsertOneOptions | CollectionInsertManyOptions
  ): Promise<T | T[]> {
    return this.repository.create(props as any, this.opts(opts));
  }

  async createOne(
    props: Partial<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<T> {
    return this.repository.createOne(props, this.opts(opts));
  }

  async createMany(
    props: Partial<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<T[]> {
    return this.repository.createMany(props, this.opts(opts));
  }

  async insertOne(
    model: OptionalId<T>,
    opts?: CollectionInsertOneOptions
  ): Promise<InsertOneWriteOpResult<any>> {
    return this.repository.insertOne(model, this.opts(opts));
  }

  async insertMany(
    models: OptionalId<T>[],
    opts?: CollectionInsertManyOptions
  ): Promise<InsertWriteOpResult<any>> {
    return this.repository.insertMany(models, this.opts(opts));
  }

  async findOneAndUpdate(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts: FindOneAndUpdateOption = {}
  ): Promise<T | null> {
    return this.repository.findOneAndUpdate(filter, update, this.opts(opts));
  }

  async findByIdAndUpdate(
    id: any,
    update: UpdateQuery<T>,
    opts: FindOneAndUpdateOption = {}
  ): Promise<T | null> {
    return this.repository.findByIdAndUpdate(id, update, this.opts(opts));
  }

  async findOneAndReplace(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T | null> {
    return this.repository.findOneAndReplace(filter, props, this.opts(opts));
  }

  async findByIdAndReplace(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: FindOneAndReplaceOption
  ): Promise<T | null> {
    return this.repository.findByIdAndReplace(id, props, this.opts(opts));
  }

  async findOneAndDelete(
    filter: FilterQuery<T | any>,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null> {
    return this.repository.findOneAndDelete(filter, this.opts(opts));
  }

  async findByIdAndDelete(
    id: any,
    opts?: FindOneAndDeleteOption
  ): Promise<T | null> {
    return this.repository.findByIdAndDelete(id, this.opts(opts));
  }

  async updateOne(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult> {
    return this.repository.updateOne(filter, update, this.opts(opts));
  }

  async updateById(
    id: any,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult> {
    return this.repository.updateById(id, update, this.opts(opts));
  }

  async updateMany(
    filter: FilterQuery<T | any>,
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult> {
    return this.repository.updateMany(filter, update, this.opts(opts));
  }

  async updateByIds(
    ids: any[],
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateWriteOpResult> {
    return this.repository.updateByIds(ids, update, this.opts(opts));
  }

  async replaceOne(
    filter: FilterQuery<T | any>,
    props: OptionalId<Partial<T>>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult> {
    return this.repository.replaceOne(filter, props, this.opts(opts));
  }

  async replaceById(
    id: any,
    props: OptionalId<Partial<T>>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceWriteOpResult> {
    return this.repository.replaceById(id, props, this.opts(opts));
  }

  async deleteOne(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean> {
    return this.repository.deleteOne(filter, this.opts(opts));
  }

  async deleteById(
    id: any,
    opts?: CommonOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean> {
    return this.repository.deleteById(id, this.opts(opts));
  }

  async deleteMany(
    filter: FilterQuery<T | any>,
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject> {
    return this.repository.deleteMany(filter, this.opts(opts));
  }

  async deleteByIds(
    ids: any[],
    opts?: CommonOptions
  ): Promise<DeleteWriteOpResultObject> {
    return this.repository.deleteByIds(ids, this.opts(opts));
  }

  private opts(opts: any = {}): { [key: string]: any; session: ClientSession } {
    return { ...opts, session: this.session };
  }
}
