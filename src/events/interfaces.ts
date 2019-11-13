import { DocumentMetadata } from '../metadata/DocumentMetadata';
import { DocumentManager } from '../DocumentManager';
import { FilterQuery, UpdateQuery } from '../types';

export enum Events {
  // events on single document
  BeforeInsert = 'beforeInsert',
  AfterInsert = 'afterInsert',
  BeforeUpdate = 'beforeUpdate',
  AfterUpdate = 'afterUpdate',
  BeforeDelete = 'beforeDelete',
  AfterDelete = 'afterDelete',

  // events on many documents
  BeforeUpdateMany = 'beforeUpdateMany',
  AfterUpdateMany = 'afterUpdateMany',
  BeforeDeleteMany = 'beforeDeleteMany',
  AfterDeleteMany = 'afterDeleteMany'
}

export interface Event<T = any> {
  meta: DocumentMetadata<T>;
}

export interface InsertEvent<T = any> extends Event<T> {
  model: T;
}

export interface UpdateEvent<T = any> extends Event<T> {
  update: UpdateQuery<T>;
  filter: FilterQuery<T>;
}

export interface DeleteEvent<T = any> extends Event<T> {
  filter: FilterQuery<T>;
}

export interface EventSubscriber<T = any> {
  getSubscribedDocuments?(dm: DocumentManager): any[];

  // events on single document
  beforeInsert?(e: InsertEvent<T>): Promise<void> | void;
  afterInsert?(e: InsertEvent<T>): Promise<void> | void;
  beforeUpdate?(e: UpdateEvent<T>): Promise<void> | void;
  afterUpdate?(e: UpdateEvent<T>): Promise<void> | void;
  beforeDelete?(e: DeleteEvent<T>): Promise<void> | void;
  afterDelete?(e: DeleteEvent<T>): Promise<void> | void;

  // events on many documents
  beforeUpdateMany?(e: UpdateEvent<T>): Promise<void> | void;
  afterUpdateMany?(e: UpdateEvent<T>): Promise<void> | void;
  beforeDeleteMany?(e: DeleteEvent<T>): Promise<void> | void;
  afterDeleteMany?(e: DeleteEvent<T>): Promise<void> | void;
}
