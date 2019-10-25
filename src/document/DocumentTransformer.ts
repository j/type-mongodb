import { OptionalId, WithId, DocumentClass, Newable } from '../types';
import { AbstractDocumentMetadata } from '../metadata/AbstractDocumentMetadata';

export class DocumentTransformer {
  /**
   * Creates a model from model properties.
   */
  static init<T, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>,
    props: Partial<T>
  ): T {
    return this.mapDataInto(
      meta,
      this.getInstance(meta),
      props,
      this.init.bind(this)
    );
  }

  /**
   * Maps model fields to a mongodb document.
   */
  static toDB<T, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>,
    model: T
  ): OptionalId<T> {
    return this.mapDataInto(
      meta,
      {},
      this.prepare(meta, model),
      this.toDB.bind(this)
    );
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  static fromDB<T, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>,
    doc: Partial<T> | any
  ): T {
    return this.mapDataInto(
      meta,
      this.getInstance(meta, false),
      doc,
      this.fromDB.bind(this)
    );
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected static getInstance<T>(
    meta: AbstractDocumentMetadata<T>,
    prepare: boolean = true
  ): T {
    const instance = new meta.DocumentClass();

    return prepare ? this.prepare(meta, instance) : instance;
  }

  /**
   * Iterates over the fields for mapping between different types
   */
  protected static mapDataInto<T>(
    meta: AbstractDocumentMetadata<T>,
    into: any,
    data: any,
    map: (meta: AbstractDocumentMetadata<T>, value: any) => any
  ): T {
    meta.fields.forEach(
      ({ isEmbedded, isEmbeddedArray, embeddedMetadata, fieldName }) => {
        if (typeof data[fieldName] !== 'undefined') {
          if (!isEmbedded) {
            into[fieldName] = data[fieldName];
          } else if (isEmbeddedArray) {
            into[fieldName] = (data[fieldName] || []).map((value: any) =>
              map(embeddedMetadata, value)
            );
          } else {
            into[fieldName] = map(embeddedMetadata, data[fieldName]);
          }
        }
      }
    );

    return into;
  }

  protected static prepare<T>(
    meta: AbstractDocumentMetadata<T>,
    object: any
  ): T {
    if (meta.hasId()) {
      (object as WithId)._id = meta.id((object as WithId)._id);
    }

    return object;
  }
}
