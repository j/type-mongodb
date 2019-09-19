import { DocumentManager } from './DocumentManager';
import {
  Newable,
  FilterQuery,
  FindOneOptions,
  Cursor,
  OptionalId,
  InsertManyOptions,
  InsertManyResult,
  InsertOneOptions,
  InsertOneResult,
  FindOneAndDeleteOptions,
  FindOneAndUpdateOptions,
  UpdateQuery,
  FindOneAndReplaceOptions,
  UpdateManyOptions,
  UpdateManyResult,
  UpdateOneResult,
  UpdateOneOptions,
  ReplaceOneResult,
  ReplaceOneOptions,
  DeleteOptions,
  DeleteResult,
  FieldsOf
} from './common/types';

/**
 * Gives a document active record functionality.
 */
export abstract class Model {
  // @ts-ignore
  private static dm: DocumentManager;

  // -------------------------------------------------------------------------
  // Active Record Methods
  // -------------------------------------------------------------------------

  static setDocumentManager(dm: DocumentManager) {
    this.dm = dm;
  }

  static find<T extends Model>(
    this: Newable<T>,
    query?: FilterQuery<T>,
    options?: FindOneOptions
  ): Cursor<T | null> {
    return ((this as any).dm as DocumentManager).find(this, query, options);
  }

  static async findById<T extends Model>(
    this: Newable<T>,
    id: any
  ): Promise<T | null> {
    return ((this as any).dm as DocumentManager).findById(this, id);
  }

  static async findByIdOrFail<T extends Model>(
    this: Newable<T>,
    id: any
  ): Promise<T | null> {
    return ((this as any).dm as DocumentManager).findByIdOrFail(this, id);
  }

  static async findOne<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    options?: FindOneOptions
  ): Promise<T> {
    return ((this as any).dm as DocumentManager).findOne(this, filter, options);
  }

  static async findOneOrFail<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    options?: FindOneOptions
  ): Promise<T> {
    return ((this as any).dm as DocumentManager).findOneOrFail(
      this,
      filter,
      options
    );
  }

  static async insertMany<T extends Model>(
    this: Newable<T>,
    models: OptionalId<T>[],
    opts?: InsertManyOptions
  ): Promise<InsertManyResult> {
    return ((this as any).dm as DocumentManager).insertMany(this, models, opts);
  }

  static async insertOne<T extends Model>(
    this: Newable<T>,
    model: OptionalId<T>,
    opts?: InsertOneOptions
  ): Promise<InsertOneResult> {
    return ((this as any).dm as DocumentManager).insertOne(model, opts);
  }

  static async findOneAndDelete<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    opts?: FindOneAndDeleteOptions
  ): Promise<T | null> {
    return ((this as any).dm as DocumentManager).findOneAndDelete(
      this,
      filter,
      opts
    );
  }

  static async findOneAndUpdate<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    update: UpdateQuery<T> | T,
    opts?: FindOneAndUpdateOptions
  ): Promise<T | null> {
    return ((this as any).dm as DocumentManager).findOneAndUpdate(
      this,
      filter,
      update,
      opts
    );
  }

  static async findOneAndReplace<T extends Model, P = FieldsOf<T>>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    props: OptionalId<P>,
    opts?: FindOneAndReplaceOptions
  ): Promise<T | null> {
    return ((this as any).dm as DocumentManager).findOneAndReplace(
      this,
      filter,
      props,
      opts
    );
  }

  static async updateMany<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    opts?: UpdateManyOptions
  ): Promise<UpdateManyResult> {
    return ((this as any).dm as DocumentManager).updateMany(
      this,
      filter,
      update,
      opts
    );
  }

  static async updateOne<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    opts?: UpdateOneOptions
  ): Promise<UpdateOneResult> {
    return ((this as any).dm as DocumentManager).updateOne(
      this,
      filter,
      update,
      opts
    );
  }

  static async replaceOne<T extends Model, P = FieldsOf<T>>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    props: OptionalId<P>,
    opts?: ReplaceOneOptions
  ): Promise<ReplaceOneResult> {
    return ((this as any).dm as DocumentManager).replaceOne(
      this,
      filter,
      props,
      opts
    );
  }

  static async deleteMany<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    opts?: DeleteOptions
  ): Promise<DeleteResult> {
    return ((this as any).dm as DocumentManager).deleteMany(this, filter, opts);
  }

  static async deleteOne<T extends Model>(
    this: Newable<T>,
    filter: FilterQuery<T>,
    opts?: DeleteOptions & { bypassDocumentValidation?: boolean }
  ): Promise<boolean> {
    return ((this as any).dm as DocumentManager).deleteOne(this, filter, opts);
  }
}
