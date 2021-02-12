import { FilterQuery } from 'mongodb';
import { Newable, OptionalId } from '../typings';
import { FieldMetadata } from './FieldMetadata';
import { ParentDefinition } from './definitions';
import { DiscriminatorMetadata } from './DiscriminatorMetadata';
import { InternalError } from '../errors';
import { DocumentTransformer, QueryFilterTransformer } from '../transformer';

export type FieldsMetadata = Map<string, FieldMetadata>;

/**
 * AbstractDocumentMetadata contains all the needed info for Document and embedded
 * documents.
 */
export abstract class AbstractDocumentMetadata<
  T,
  D extends Newable = Newable<T>
> {
  public readonly DocumentClass: D;
  public readonly name: string;
  public readonly fields: FieldsMetadata;
  public readonly idField: FieldMetadata;
  public readonly parent?: ParentDefinition;
  public readonly discriminator?: DiscriminatorMetadata;
  public readonly documentTransformer: DocumentTransformer<T, D>;
  public readonly queryFilterTransformer: QueryFilterTransformer<T>;

  constructor(
    DocumentClass: D,
    fields: FieldsMetadata,
    parent?: ParentDefinition,
    discriminator?: DiscriminatorMetadata
  ) {
    this.DocumentClass = DocumentClass;
    this.name = DocumentClass.name;
    this.fields = fields;
    this.parent = parent;
    this.discriminator = discriminator;
    this.documentTransformer = DocumentTransformer.create(this);
    this.queryFilterTransformer = QueryFilterTransformer.create(this);

    // set the idField property if it exists
    this.idField = this.fields.get('_id');

    if (
      // root documents must have an `_id` field
      (this.isRoot() && !this.idField) ||
      // _id fields must be valid "IDs"
      (this.idField && !this.idField.isId)
    ) {
      InternalError.throw(
        `The "${this.DocumentClass.name}" document is missing an "@Id" decorated "_id" property`
      );
    }
  }

  /**
   * For detecting whether this metadata is for a root document.
   */
  abstract isRoot(): boolean;

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * Maps model fields to a mongodb document.
   */
  toDB(model: Partial<T> | { [key: string]: any }): T & { [key: string]: any } {
    return this.documentTransformer.toDB(model);
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  fromDB(doc: Partial<D> | { [key: string]: any }): T {
    return this.documentTransformer.fromDB(doc);
  }

  /**
   * Creates a model from model properties.
   */
  init(props: OptionalId<Partial<T>> | { [key: string]: any }): T {
    return this.documentTransformer.init(props);
  }

  /**
   * Creates a model from model properties.
   */
  merge(model: T, props: Partial<T> | { [key: string]: any }): T {
    return this.documentTransformer.merge(model, props);
  }

  /**
   * Transforms query filters.
   */
  transformQueryFilter(input: FilterQuery<T>): FilterQuery<any> {
    return this.queryFilterTransformer.transform(input);
  }
}
