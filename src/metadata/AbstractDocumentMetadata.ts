import { OptionalUnlessRequiredId } from 'mongodb';
import { Constructor, PartialDeep, WithDocumentFields } from '../typings';
import { FieldMetadata } from './FieldMetadata';
import { ParentDefinition } from './definitions';
import { DiscriminatorMetadata } from './DiscriminatorMetadata';
import { InternalError } from '../errors';
import { Hydrator, HydratorFactory } from '../hydration';
import { DocumentManager } from '../DocumentManager';
import { cast, CastInput, CastType } from '../utils';

export type FieldsMetadata = Map<string, FieldMetadata>;

/**
 * AbstractDocumentMetadata contains all the needed info for Document and embedded
 * documents.
 */
export abstract class AbstractDocumentMetadata<
  Model = any,
  Document = WithDocumentFields<Model>
> {
  public readonly manager: DocumentManager;
  public readonly DocumentClass: Constructor<Model>;
  public readonly name: string;
  public readonly fields: FieldsMetadata;
  public readonly idField: FieldMetadata;
  public readonly parent?: ParentDefinition;
  public readonly discriminator?: DiscriminatorMetadata;
  public readonly hydrator: Hydrator<Model, Document>;

  constructor(
    manager: DocumentManager,
    DocumentClass: Constructor<Model>,
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
    this.hydrator = HydratorFactory.create<Model, Document>(this);

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
   * Creates a model from it's properties.
   */
  init(props: PartialDeep<Model>): Model {
    return this.hydrator.init(props);
  }

  /**
   * Creates a model from model properties.
   */
  merge(model: Model, props: PartialDeep<Model>): Model {
    return this.hydrator.merge(model, props);
  }

  /**
   * Converts the model to a plain object.
   */
  toObject(model: Model): Model {
    return this.hydrator.toObject(model);
  }

  /**
   * Converts the model fields to a mongodb document.
   */
  toDB(model: Model): OptionalUnlessRequiredId<Document> {
    if (!(model instanceof this.DocumentClass)) {
      model = this.init(model as PartialDeep<Model>);
    }

    return this.hydrator.toDB(model);
  }

  /**
   * Creates a model from a document.
   */
  fromDB(doc: Record<string, any>): Model {
    return this.hydrator.fromDB(doc);
  }

  /**
   * Casts the fields & values to MongoDB filters or update queries.
   */
  cast<I extends CastInput<Model>>(input: I, type: CastType): I {
    return cast(this, input, type);
  }
}
