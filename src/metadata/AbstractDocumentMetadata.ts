import { Filter, OptionalId } from 'mongodb';
import { Constructor, PartialDeep } from '../typings';
import { FieldMetadata } from './FieldMetadata';
import { ParentDefinition } from './definitions';
import { DiscriminatorMetadata } from './DiscriminatorMetadata';
import { InternalError } from '../errors';
import { DocumentTransformer, QueryFilterTransformer } from '../transformer';
import { DocumentManager } from '../DocumentManager';

export type FieldsMetadata = Map<string, FieldMetadata>;

/**
 * AbstractDocumentMetadata contains all the needed info for Document and embedded
 * documents.
 */
export abstract class AbstractDocumentMetadata<T> {
  public readonly manager: DocumentManager;
  public readonly DocumentClass: Constructor<T>;
  public readonly name: string;
  public readonly fields: FieldsMetadata;
  public readonly idField: FieldMetadata;
  public readonly parent?: ParentDefinition;
  public readonly discriminator?: DiscriminatorMetadata;
  public readonly documentTransformer: DocumentTransformer<T>;
  public readonly queryFilterTransformer: QueryFilterTransformer<T>;

  constructor(
    manager: DocumentManager,
    DocumentClass: Constructor<T>,
    fields: FieldsMetadata,
    parent?: ParentDefinition,
    discriminator?: DiscriminatorMetadata
  ) {
    this.manager = manager;
    this.DocumentClass = DocumentClass;
    this.name = DocumentClass.name;
    this.fields = fields;
    this.parent = parent;
    this.discriminator = discriminator;
    this.documentTransformer = DocumentTransformer.create(this);
    this.queryFilterTransformer = QueryFilterTransformer.create(this);

    // set the idField property if it exists
    this.idField = [...this.fields.values()].find((f) => f.fieldName === '_id');

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
   * Creates a model from model properties.
   */
  init(props: PartialDeep<T>): T {
    return this.documentTransformer.init(props);
  }

  /**
   * Creates a model from model properties.
   */
  merge(model: T, props: PartialDeep<T>): T {
    return this.documentTransformer.merge(model, props);
  }

  /**
   * Maps model fields to a mongodb document.
   */
  toDB(model: T): OptionalId<any> {
    return this.documentTransformer.toDB(model);
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  fromDB(doc: Record<string, any>): T {
    return this.documentTransformer.fromDB(doc);
  }

  /**
   * Transforms query filters.
   */
  transformQueryFilter(input: Filter<T>): Filter<any> {
    return this.queryFilterTransformer.transform(input);
  }
}
