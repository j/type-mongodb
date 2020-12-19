import {
  Events,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  DeleteEvent,
  ReplaceEvent
} from './interfaces';
import { Newable } from '../types';
import { DocumentManager } from '../DocumentManager';

type EventSubscribers = Map<Events, EventSubscriber[]>;

/**
 * EventManager takes event subscribers, determines what events to be
 * triggered on specific documents, etc.
 */
export class EventManager {
  protected subscribers: EventSubscriber[] = [];
  protected documentsWithSubscribers: Map<
    Newable,
    EventSubscribers
  > = new Map();

  constructor(subscribers: EventSubscriber[]) {
    this.subscribers = subscribers || [];
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  addEventSubscriber(subscriber: EventSubscriber): void {
    this.subscribers.push(subscriber);
  }

  /**
   * For performance reasons, we specifically assign events to objects and only events that exist
   * in the subscriber.  A lot of ORMs and middleware based libraries iterate over subscribers
   * or middleware and  call logic one at a time.  By allowing subscribers to have a
   * `getSubscribedDocuments` method, then you're able to dynamically filter out applicable
   * documents to emit events to.  An example would be to filter documents that have a `updatedAt`
   * field, and if so, automatically add `{ $set: { updatedAt: new Date() } }` for each
   * update query.
   */
  build(dm: DocumentManager) {
    this.documentsWithSubscribers.clear();

    const documents: Newable[] = Array.from(
      dm.metadataFactory.loadedDocumentMetadata.values()
    ).map((meta) => meta.DocumentClass);

    this.subscribers.forEach((subscriber) => {
      const subscribedDocuments =
        typeof subscriber.getSubscribedDocuments === 'function'
          ? subscriber.getSubscribedDocuments(dm)
          : null;

      documents.forEach((DocumentClass) => {
        if (!subscribedDocuments) {
          this.attachSubscriberToDocument(DocumentClass, subscriber);
        } else if (subscribedDocuments.includes(DocumentClass)) {
          this.attachSubscriberToDocument(DocumentClass, subscriber);
        }
      });
    });
  }

  dispatchBeforeAndAfter<T1 = any, T2 = any>(
    before: Events.BeforeInsert,
    after: Events.AfterInsert,
    e: InsertEvent<T1>,
    run: () => Promise<T2>
  ): Promise<T2>;
  dispatchBeforeAndAfter<T1 = any, T2 = any>(
    before: Events.BeforeUpdate,
    after: Events.AfterUpdate,
    e: UpdateEvent<T1>,
    run: () => Promise<T2>
  ): Promise<T2>;
  dispatchBeforeAndAfter<T1 = any, T2 = any>(
    before: Events.BeforeDelete,
    after: Events.AfterDelete,
    e: DeleteEvent<T1>,
    run: () => Promise<T2>
  ): Promise<T2>;
  dispatchBeforeAndAfter<T1 = any, T2 = any>(
    before: Events.BeforeReplace,
    after: Events.AfterReplace,
    e: ReplaceEvent<T1>,
    run: () => Promise<T2>
  ): Promise<T2>;
  dispatchBeforeAndAfter<T1 = any, T2 = any>(
    before: Events.BeforeUpdateMany,
    after: Events.AfterUpdateMany,
    e: UpdateEvent<T1>,
    run: () => Promise<T2>
  ): Promise<T2>;
  dispatchBeforeAndAfter<T1 = any, T2 = any>(
    before: Events.BeforeDeleteMany,
    after: Events.AfterDeleteMany,
    e: DeleteEvent<T1>,
    run: () => Promise<T2>
  ): Promise<T2>;
  async dispatchBeforeAndAfter<T1 = any, T2 = any>(
    before: Events,
    after: Events,
    e: InsertEvent<T1> | UpdateEvent<T1> | DeleteEvent<T1> | ReplaceEvent<T1>,
    run: () => Promise<T2>
  ): Promise<T2> {
    await this.dispatch(before, e);
    const result = await run();
    await this.dispatch(after, e);

    return result;
  }

  /**
   * Dispatches the all the subscribed events for the document.
   */
  async dispatch<T = any>(
    type: Events,
    e: InsertEvent<T> | UpdateEvent<T> | DeleteEvent<T> | ReplaceEvent<T>
  ): Promise<void> {
    if (!this.documentsWithSubscribers.has(e.meta.DocumentClass)) {
      return;
    }

    const documentSubscribers = this.documentsWithSubscribers.get(
      e.meta.DocumentClass
    );

    if (!documentSubscribers.has(type)) {
      return;
    }

    const eventSubscribers = documentSubscribers.get(type);

    for (let subscriber of eventSubscribers) {
      await subscriber[type as any](e);
    }
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  /**
   * Attaches the subscriber's defined methods to the document.
   */
  protected attachSubscriberToDocument(
    DocumentClass: Newable,
    subscriber: EventSubscriber
  ) {
    if (!this.documentsWithSubscribers.has(DocumentClass)) {
      this.documentsWithSubscribers.set(DocumentClass, new Map());
    }

    const subscribers = this.documentsWithSubscribers.get(DocumentClass);

    Object.keys(Events).forEach((event) => {
      const fn = Events[event];

      if (typeof subscriber[fn] === 'function') {
        if (!subscribers.has(fn)) {
          subscribers.set(fn, []);
        }

        subscribers.get(fn).push(subscriber);
      }
    });
  }
}
