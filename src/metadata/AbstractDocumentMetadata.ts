import { DocumentType, PropsOf, OptionalId } from '../common/types';
import { FieldMetadata } from './FieldMetadata';

export type FieldsMetadata = Map<string, FieldMetadata>;

/**
 * BaseDocumentMetadata contains all the needed info for Document and embedded
 * documents.
 */
export abstract class AbstractDocumentMetadata<T> {
  public readonly DocumentClass: DocumentType<T>;
  public readonly name: string;
  public readonly fields: FieldsMetadata;

  constructor(DocumentClass: DocumentType<T>, fields: FieldsMetadata) {
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
  toDB(model: T): PropsOf<T> {
    return this.mapDataInto({}, model, 'toDB');
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  fromDB(doc: PropsOf<T> | any): T {
    return this.mapDataInto(new this.DocumentClass(), doc, 'fromDB');
  }

  /**
   * Creates a model from model properties.
   */
  init(props: PropsOf<OptionalId<T>>): T {
    return this.mapDataInto(new this.DocumentClass(), props, 'init');
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  /**
   * Iterates over the fields for mapping between different types
   */
  protected mapDataInto(
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
