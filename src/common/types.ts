import {
  FindOneOptions,
  CollectionInsertManyOptions,
  InsertWriteOpResult,
  CollectionInsertOneOptions,
  InsertOneWriteOpResult,
  FindOneAndDeleteOption,
  FindOneAndUpdateOption,
  FindOneAndReplaceOption,
  UpdateWriteOpResult,
  ReplaceWriteOpResult,
  CommonOptions,
  DeleteWriteOpResultObject
} from 'mongodb';

export type DocumentType<T = any> = Newable<WithId<T>>;
export type DocumentInstance<T = any> = WithId<T>;
export type WithId<T = any> = Omit<T, '_id'> & { _id: any };
export type OptionalId<T = any> = Omit<T, '_id'> & { _id?: any };
export type Newable<T = any> = new (...args: any[]) => T;
export type PropsOf<T = any> = { [P in keyof T]: T[P] };

/**
 * Mongo Types
 */
export {
  Cursor,
  Collection,
  Db,
  ObjectId,
  FilterQuery,
  UpdateQuery,
  UpdateManyOptions,
  UpdateOneOptions,
  ReplaceOneOptions
} from 'mongodb';
export type FindOptions = FindOneOptions;
export type FindOneOptions = FindOneOptions;
export type InsertManyOptions = CollectionInsertManyOptions;
export type InsertManyResult = InsertWriteOpResult;
export type InsertOneOptions = CollectionInsertOneOptions;
export type InsertOneResult = InsertOneWriteOpResult;
export type FindOneAndDeleteOptions = FindOneAndDeleteOption;
export type FindOneAndUpdateOptions = FindOneAndUpdateOption;
export type FindOneAndReplaceOptions = FindOneAndReplaceOption;
export type UpdateManyResult = UpdateWriteOpResult;
export type UpdateOneResult = UpdateWriteOpResult;
export type ReplaceOneResult = ReplaceWriteOpResult;
export type DeleteOptions = CommonOptions;
export type DeleteResult = DeleteWriteOpResultObject;
