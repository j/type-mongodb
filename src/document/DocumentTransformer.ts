import { WithId, DocumentClass, Newable } from '../types';
import { AbstractDocumentMetadata } from '../metadata/AbstractDocumentMetadata';

export class DocumentTransformer {
  /**
   * Creates a model from model properties.
   */
  static init<T, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>,
    props: Partial<T>
  ): T {
    return this.mapDataInto({
      meta,
      into: this.getInstance(meta),
      intoField: 'propertyName',
      data: props,
      dataField: 'propertyName',
      map: this.init.bind(this)
    });
  }

  /**
   * Merges props into the given model
   */
  static merge<T, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>,
    model: T,
    props: Partial<T>
  ): T {
    return this.mapDataInto({
      meta,
      into: model,
      intoField: 'propertyName',
      data: props,
      dataField: 'propertyName',
      map: this.merge.bind(this)
    });
  }

  /**
   * Maps model fields to a mongodb document.
   */
  static toDB<T, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>,
    model: T
  ): T & { [key: string]: any } {
    return this.mapDataInto({
      meta,
      into: {},
      intoField: 'fieldName',
      data: this.prepare(meta, model),
      dataField: 'propertyName',
      map: this.toDB.bind(this)
    });
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  static fromDB<T, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>,
    doc: Partial<T & { [key: string]: any }>
  ): T {
    return this.mapDataInto({
      meta,
      into: this.getInstance(meta, false),
      intoField: 'propertyName',
      data: doc,
      dataField: 'fieldName',
      map: this.fromDB.bind(this)
    });
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
  protected static mapDataInto<T>(opts: {
    meta: AbstractDocumentMetadata<T>;
    into: any;
    intoField: 'fieldName' | 'propertyName';
    data: any;
    dataField: 'fieldName' | 'propertyName';
    map: (meta: AbstractDocumentMetadata<T>, value: any) => any;
  }): T {
    const { meta, into, intoField, data, dataField, map } = opts;

    meta.fields.forEach(
      ({ isEmbedded, isEmbeddedArray, embeddedMetadata, ...fieldMeta }) => {
        const dataFieldName = fieldMeta[dataField];
        const intoFieldName = fieldMeta[intoField];

        if (
          typeof data !== 'undefined' &&
          typeof data[dataFieldName] !== 'undefined'
        ) {
          if (!isEmbedded) {
            into[intoFieldName] = data[dataFieldName];
          } else if (isEmbeddedArray) {
            into[intoFieldName] = (data[dataFieldName] || []).map(
              (value: any) => (value ? map(embeddedMetadata, value) : null)
            );
          } else {
            into[intoFieldName] = data[dataFieldName]
              ? map(embeddedMetadata, data[dataFieldName])
              : null;
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
