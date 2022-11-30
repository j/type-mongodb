import {
  Events,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  DeleteEvent,
  ReplaceEvent,
  InsertManyEvent,
  EventSubscriberMethods
} from './interfaces';
import { Constructor } from '../typings';
import { DocumentManager } from '../DocumentManager';

type EventSubscribers = Map<EventSubscriberMethods, EventSubscriber[]>;

/**
 * EventManager takes event subscribers, determines what events to be
 * triggered on specific documents, etc.
 */
export class EventManager {
  protected subscribers: EventSubscriber[] = [];
  protected documentsWithSubscribers: Map<Constructor, EventSubscribers> =
    new Map();

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
  build(manager: DocumentManager) {
    this.documentsWithSubscribers.clear();

    const documents: Constructor[] = Array.from(
      manager.metadataFactory.loadedDocumentMetadata.values()
    ).map((meta) => meta.DocumentClass);

    this.subscribers.forEach((subscriber) => {
      const subscribedDocuments =
        typeof subscriber.getSubscribedDocuments === 'function'
          ? subscriber.getSubscribedDocuments(manager)
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

  dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods.BeforeInsert,
    after: EventSubscriberMethods.AfterInsert,
    e: InsertEvent<Model, Document>,
    run: () => Response
  ): Promise<Response>;
  dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods.BeforeUpdate,
    after: EventSubscriberMethods.AfterUpdate,
    e: UpdateEvent<Model, Document>,
    run: () => Response
  ): Promise<Response>;
  dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods.BeforeDelete,
    after: EventSubscriberMethods.AfterDelete,
    e: DeleteEvent<Model, Document>,
    run: () => Response
  ): Promise<Response>;
  dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods.BeforeReplace,
    after: EventSubscriberMethods.AfterReplace,
    e: ReplaceEvent<Model, Document>,
    run: () => Response
  ): Promise<Response>;
  dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods.BeforeInsertMany,
    after: EventSubscriberMethods.AfterInsertMany,
    e: InsertManyEvent<Model, Document>,
    run: () => Response
  ): Promise<Response>;
  dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods.BeforeUpdateMany,
    after: EventSubscriberMethods.AfterUpdateMany,
    e: UpdateEvent<Model, Document>,
    run: () => Response
  ): Promise<Response>;
  dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods.BeforeDeleteMany,
    after: EventSubscriberMethods.AfterDeleteMany,
    e: DeleteEvent<Model, Document>,
    run: () => Response
  ): Promise<Response>;
  async dispatchBeforeAndAfter<Response, Model = any, Document = any>(
    before: EventSubscriberMethods,
    after: EventSubscriberMethods,
    e: Events<Model, Document>,
    run: () => Response
  ): Promise<Response> {
    await this.dispatch(before, e);
    const result = await run();
    await this.dispatch(after, e);

    return result;
  }

  /**
   * Dispatches the all the subscribed events for the document.
   */
  async dispatch<T = any>(
    type: EventSubscriberMethods,
    e: Events<T>
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

    for (const subscriber of eventSubscribers) {
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
    DocumentClass: Constructor,
    subscriber: EventSubscriber
  ) {
    if (!this.documentsWithSubscribers.has(DocumentClass)) {
      this.documentsWithSubscribers.set(DocumentClass, new Map());
    }

    const subscribers = this.documentsWithSubscribers.get(DocumentClass);

    Object.keys(EventSubscriberMethods).forEach((event) => {
      const fn = EventSubscriberMethods[event];

      if (typeof subscriber[fn] === 'function') {
        if (!subscribers.has(fn)) {
          subscribers.set(fn, []);
        }

        subscribers.get(fn).push(subscriber);
      }
    });
  }
}
