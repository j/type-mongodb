import { ObjectId } from 'mongodb';
import { Newable } from '../types';
import { FieldMetadata } from './FieldMetadata';
import { DocumentTransformer } from '../document/DocumentTransformer';

export type FieldsMetadata = Map<string, FieldMetadata>;

/**
 * BaseDocumentMetadata contains all the needed info for Document and embedded
 * documents.
 */
export abstract class AbstractDocumentMetadata<
  T,
  D extends Newable = Newable<T>
> {
  public readonly DocumentClass: D;
  public readonly name: string;
  public readonly fields: FieldsMetadata;

  constructor(DocumentClass: D, fields: FieldsMetadata) {
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
   * Creates the document _id.
   */
  id(id?: string | ObjectId): ObjectId {
    return new ObjectId(id);
  }

  /**
   * Checks if given id is a valid one.
   */
  isValidId(id?: any): boolean {
    return ObjectId.isValid(id);
  }

  /**
   * Creates the document _id.
   */
  hasId(): boolean {
    return this.fields.has('_id');
  }

  /**
   * Maps model fields to a mongodb document.
   */
  toDB(model: T): T & { [key: string]: any } {
    return DocumentTransformer.toDB(this, model);
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  fromDB(doc: Partial<T & { [key: string]: any }>): T {
    return DocumentTransformer.fromDB(this, doc);
  }

  /**
   * Creates a model from model properties.
   */
  init(props: Partial<T>): T {
    return DocumentTransformer.init(this, props);
  }

  /**
   * Creates a model from model properties.
   */
  merge(model: T, props: Partial<T>): T {
    return DocumentTransformer.merge(this, model, props);
  }
}
