import { Filter, UpdateQuery } from 'mongodb';
import { DocumentMetadata } from '../metadata';
import { DocumentManager } from '../DocumentManager';

export interface Event<T = any> {
  meta: DocumentMetadata<T>;
}

export interface InsertEvent<T = any> extends Event<T> {
  model: T;
}

export interface InsertManyEvent<T = any> extends Event<T> {
  models: T[];
}

export interface UpdateEvent<T = any> extends Event<T> {
  update: UpdateQuery<T>;
  filter: Filter<T>;
}

export interface DeleteEvent<T = any> extends Event<T> {
  filter: Filter<T>;
}

export interface ReplaceEvent<T = any> extends Event<T> {
  filter: Filter<T>;
  model: T;
}

export type Events<T> =
  | InsertEvent<T>
  | InsertManyEvent<T>
  | UpdateEvent<T>
  | DeleteEvent<T>
  | ReplaceEvent<T>;

export enum EventSubscriberMethods {
  // events on single document
  BeforeInsert = 'beforeInsert',
  AfterInsert = 'afterInsert',
  BeforeUpdate = 'beforeUpdate',
  AfterUpdate = 'afterUpdate',
  BeforeDelete = 'beforeDelete',
  AfterDelete = 'afterDelete',
  BeforeReplace = 'beforeReplace',
  AfterReplace = 'afterReplace',

  // events on many documents
  BeforeInsertMany = 'beforeInsertMany',
  AfterInsertMany = 'afterInsertMany',
  BeforeUpdateMany = 'beforeUpdateMany',
  AfterUpdateMany = 'afterUpdateMany',
  BeforeDeleteMany = 'beforeDeleteMany',
  AfterDeleteMany = 'afterDeleteMany'
}

export interface EventSubscriber<T = any> {
  getSubscribedDocuments?(manager: DocumentManager): any[];

  // events on single document
  beforeInsert?(e: InsertEvent<T>): Promise<void> | void;
  afterInsert?(e: InsertEvent<T>): Promise<void> | void;
  beforeUpdate?(e: UpdateEvent<T>): Promise<void> | void;
  afterUpdate?(e: UpdateEvent<T>): Promise<void> | void;
  beforeDelete?(e: DeleteEvent<T>): Promise<void> | void;
  afterDelete?(e: DeleteEvent<T>): Promise<void> | void;
  beforeReplace?(e: ReplaceEvent<T>): Promise<void> | void;
  afterReplace?(e: ReplaceEvent<T>): Promise<void> | void;

  // events on many documents
  beforeInsertMany?(e: InsertManyEvent<T>): Promise<void> | void;
  afterInsertMany?(e: InsertManyEvent<T>): Promise<void> | void;
  beforeUpdateMany?(e: UpdateEvent<T>): Promise<void> | void;
  afterUpdateMany?(e: UpdateEvent<T>): Promise<void> | void;
  beforeDeleteMany?(e: DeleteEvent<T>): Promise<void> | void;
  afterDeleteMany?(e: DeleteEvent<T>): Promise<void> | void;
}
