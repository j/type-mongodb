import { DocumentMetadata } from '../metadata/DocumentMetadata';
import { DocumentManager } from '../DocumentManager';
import { FilterQuery } from '../common/types';

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

export interface Event<M = any> {
  meta: DocumentMetadata<M>;
}

export interface InsertEvent<M = any> extends Event<M> {
  model: M;
}

export interface UpdateEvent<M = any> extends Event<M> {
  update: any;
  filter: FilterQuery<M>;
}

export interface DeleteEvent<M = any> extends Event<M> {
  filter: FilterQuery<M>;
}

export interface EventSubscriber<M = any> {
  getSubscribedDocuments?(dm: DocumentManager): any[];

  // events on single document
  beforeInsert?(e: InsertEvent<M>): Promise<void> | void;
  afterInsert?(e: InsertEvent<M>): Promise<void> | void;
  beforeUpdate?(e: UpdateEvent<M>): Promise<void> | void;
  afterUpdate?(e: UpdateEvent<M>): Promise<void> | void;
  beforeDelete?(e: DeleteEvent<M>): Promise<void> | void;
  afterDelete?(e: DeleteEvent<M>): Promise<void> | void;

  // events on many documents
  beforeUpdateMany?(e: UpdateEvent<M>): Promise<void> | void;
  afterUpdateMany?(e: UpdateEvent<M>): Promise<void> | void;
  beforeDeleteMany?(e: DeleteEvent<M>): Promise<void> | void;
  afterDeleteMany?(e: DeleteEvent<M>): Promise<void> | void;
}
