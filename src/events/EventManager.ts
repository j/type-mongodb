import {
  Events,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  DeleteEvent
} from './interfaces';
import { Newable } from '../common';
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
      dm.metadataFactory.loadedMetadata.values()
    ).map(meta => meta.DocumentClass);

    this.subscribers.forEach(subscriber => {
      const subscribedDocuments =
        typeof subscriber.getSubscribedDocuments === 'function'
          ? subscriber.getSubscribedDocuments(dm)
          : null;

      documents.forEach(DocumentClass => {
        if (!subscribedDocuments) {
          this.attachSubscriberToDocument(DocumentClass, subscriber);
        } else if (subscribedDocuments.includes(DocumentClass)) {
          this.attachSubscriberToDocument(DocumentClass, subscriber);
        }
      });
    });
  }

  async dispatchBeforeAndAfter<M = any, R = any>(
    before: Events,
    after: Events,
    e: InsertEvent<M> | UpdateEvent<M> | DeleteEvent<M>,
    run: () => Promise<R>
  ): Promise<R> {
    await this.dispatch(before, e);
    const result = await run();
    await this.dispatch(after, e);

    return result;
  }

  /**
   * Dispatches the all the subscribed events for the document.
   */
  async dispatch<M = any>(
    type: Events,
    e: InsertEvent<M> | UpdateEvent<M> | DeleteEvent<M>
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

    Object.keys(Events).forEach(event => {
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
