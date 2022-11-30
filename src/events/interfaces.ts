import { Filter, UpdateFilter } from 'mongodb';
import { DocumentMetadata } from '../metadata';
import { DocumentManager } from '../DocumentManager';

export interface Event<Model, Document> {
  meta: DocumentMetadata<Model, Document>;
}

export interface InsertEvent<Model = any, Document = any>
  extends Event<Model, Document> {
  model: Model;
}

export interface InsertManyEvent<Model = any, Document = any>
  extends Event<Model, Document> {
  models: Model[];
}

export interface UpdateEvent<Model = any, Document = any>
  extends Event<Model, Document> {
  update: UpdateFilter<Document>;
  filter: Filter<Document>;
}

export interface DeleteEvent<Model = any, Document = any>
  extends Event<Model, Document> {
  filter: Filter<Document>;
}

export interface ReplaceEvent<Model = any, Document = any>
  extends Event<Model, Document> {
  filter: Filter<Document>;
  model: Model;
}

export type Events<Model = any, Document = any> =
  | InsertEvent<Model, Document>
  | InsertManyEvent<Model, Document>
  | UpdateEvent<Model, Document>
  | DeleteEvent<Model, Document>
  | ReplaceEvent<Model, Document>;

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

export interface EventSubscriber<Model = any, Document = any> {
  getSubscribedDocuments?(manager: DocumentManager): any[];

  // events on single document
  beforeInsert?(e: InsertEvent<Model, Document>): Promise<void> | void;
  afterInsert?(e: InsertEvent<Model, Document>): Promise<void> | void;
  beforeUpdate?(e: UpdateEvent<Model, Document>): Promise<void> | void;
  afterUpdate?(e: UpdateEvent<Model, Document>): Promise<void> | void;
  beforeDelete?(e: DeleteEvent<Model, Document>): Promise<void> | void;
  afterDelete?(e: DeleteEvent<Model, Document>): Promise<void> | void;
  beforeReplace?(e: ReplaceEvent<Model, Document>): Promise<void> | void;
  afterReplace?(e: ReplaceEvent<Model, Document>): Promise<void> | void;

  // events on many documents
  beforeInsertMany?(e: InsertManyEvent<Model, Document>): Promise<void> | void;
  afterInsertMany?(e: InsertManyEvent<Model, Document>): Promise<void> | void;
  beforeUpdateMany?(e: UpdateEvent<Model, Document>): Promise<void> | void;
  afterUpdateMany?(e: UpdateEvent<Model, Document>): Promise<void> | void;
  beforeDeleteMany?(e: DeleteEvent<Model, Document>): Promise<void> | void;
  afterDeleteMany?(e: DeleteEvent<Model, Document>): Promise<void> | void;
}
