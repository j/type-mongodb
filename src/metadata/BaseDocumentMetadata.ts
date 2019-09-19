import { Newable, FieldsOf } from '../common/types';
import { FieldMetadata } from './FieldMetadata';

export type FieldsMetadata = Map<string, FieldMetadata>;

/**
 * BaseDocumentMetadata contains all the needed info for Document and embedded
 * documents.
 */
export abstract class BaseDocumentMetadata<M = any, D = FieldsOf<M>> {
  public readonly DocumentClass: Newable<M>;
  public readonly name: string;
  public readonly fields: FieldsMetadata;

  constructor(DocumentClass: Newable<M>, fields: FieldsMetadata) {
    this.DocumentClass = DocumentClass;
    this.name = DocumentClass.name;
    this.fields = fields;
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  addField(prop: FieldMetadata): void {
    this.fields.set(prop.fieldName, prop);
  }

  /**
   * Maps model fields to a mongodb document.
   */
  toDB(model: M): D {
    return this.mapDataInto({}, model, 'toDB');
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  fromDB(doc: D | any): M {
    return this.mapDataInto(new this.DocumentClass(), doc, 'fromDB');
  }

  /**
   * Creates a model from model properties.
   */
  init(props: FieldsOf<M>): M {
    return this.mapDataInto(new this.DocumentClass(), props, 'init');
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  /**
   * Iterates over the fields for mapping between different types
   */
  protected mapDataInto<T>(
    into: any,
    data: any,
    mapper: 'toDB' | 'fromDB' | 'init'
  ): T {
    this.fields.forEach(
      ({ isEmbedded, isEmbeddedArray, embeddedMetadata, fieldName }) => {
        if (typeof data[fieldName] !== 'undefined') {
          if (!isEmbedded) {
            into[fieldName] = data[fieldName];
          } else if (isEmbeddedArray) {
            into[fieldName] = (data[fieldName] || []).map((value: any) =>
              embeddedMetadata[mapper](value)
            );
          } else {
            into[fieldName] = embeddedMetadata[mapper](data[fieldName]);
          }
        }
      }
    );

    return into;
  }
}
