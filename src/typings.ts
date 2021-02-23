import { WithId } from 'mongodb';

export type DocumentClass<T = any> = Newable<T>;
export type DocumentInstance<T = any> = WithId<T>;
export type Newable<T = any> = new (...args: any[]) => T;
export type PropsOf<T = any> = { -readonly [P in keyof T]: T[P] };

/**
 * Mongo Types
 */
export {
  Db,
  OptionalId,
  WithId,
  Collection,
  CollectionInsertManyOptions,
  InsertWriteOpResult,
  CommonOptions,
  CollectionInsertOneOptions,
  InsertOneWriteOpResult,
  FindOneAndDeleteOption,
  FindOneAndUpdateOption,
  FindOneAndReplaceOption,
  UpdateWriteOpResult,
  ReplaceWriteOpResult,
  DeleteWriteOpResultObject,
  FilterQuery,
  UpdateQuery,
  UpdateManyOptions,
  UpdateOneOptions,
  ReplaceOneOptions
} from 'mongodb';
