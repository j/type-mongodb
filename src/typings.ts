import { Repository } from './repository';

export type Constructor<T = any> = new (...args: any[]) => T;

export type Mutable<T> = { -readonly [P in keyof T]-?: T[P] };

export const DocumentRepository = Symbol('DocumentRepository');
export type GetRepository<T> = T extends { [DocumentRepository]: any }
  ? T[typeof DocumentRepository]
  : Repository<T>;

export const DocumentFields = Symbol('DocumentFields');
export type WithDocumentFields<T> = T extends { [DocumentFields]: any }
  ? T[typeof DocumentFields]
  : T;

export type Filter<
  Model = any,
  Document = WithDocumentFields<Model>
> = import('mongodb').Filter<Document>;
export type UpdateFilter<
  Model = any,
  Document = WithDocumentFields<Model>
> = import('mongodb').UpdateFilter<Document>;

// Borrowed from https://github.com/sindresorhus/type-fest/blob/main/source/partial-deep.d.ts

export type Primitive =
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint;

export type PartialDeep<T> = T extends Primitive
  ? Partial<T>
  : T extends Map<infer KeyType, infer ValueType>
  ? PartialMapDeep<KeyType, ValueType>
  : T extends Set<infer ItemType>
  ? PartialSetDeep<ItemType>
  : T extends ReadonlyMap<infer KeyType, infer ValueType>
  ? PartialReadonlyMapDeep<KeyType, ValueType>
  : T extends ReadonlySet<infer ItemType>
  ? PartialReadonlySetDeep<ItemType>
  : T extends (...args: any[]) => unknown
  ? T | undefined
  : T extends Record<any, any>
  ? PartialObjectDeep<T>
  : unknown;

/**
 Same as `PartialDeep`, but accepts only `Map`s and  as inputs. Internal helper for `PartialDeep`.
 */
type PartialMapDeep<KeyType, ValueType> = Map<
  PartialDeep<KeyType>,
  PartialDeep<ValueType>
>;

/**
 Same as `PartialDeep`, but accepts only `Set`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialSetDeep<T> = Set<PartialDeep<T>>;

/**
 Same as `PartialDeep`, but accepts only `ReadonlyMap`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialReadonlyMapDeep<KeyType, ValueType> = ReadonlyMap<
  PartialDeep<KeyType>,
  PartialDeep<ValueType>
>;

/**
 Same as `PartialDeep`, but accepts only `ReadonlySet`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialReadonlySetDeep<T> = ReadonlySet<PartialDeep<T>>;

/**
 Same as `PartialDeep`, but accepts only `object`s as inputs. Internal helper for `PartialDeep`.
 */
type PartialObjectDeep<ObjectType extends Record<any, any>> = {
  [KeyType in keyof ObjectType]?: PartialDeep<ObjectType[KeyType]>;
};
