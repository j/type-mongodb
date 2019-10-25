export type DocumentClass<T = any> = Newable<WithId<T>>;
export type DocumentInstance<T = any> = WithId<T>;
export type WithId<T = any> = Omit<T, '_id'> & { _id: any };
export type OptionalId<T = any> = Omit<T, '_id'> & { _id?: any };
export type Newable<T = any> = new (...args: any[]) => T;
export type PropsOf<T = any> = { -readonly [P in keyof T]: T[P] };

/**
 * Mongo Types
 */
export {
  Db,
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
