import { Newable, OptionalId } from '../typings';
import { FieldMetadata } from './FieldMetadata';
import { DocumentTransformer } from '../document/DocumentTransformer';
import { ParentDefinition } from './definitions';
import { DiscriminatorMetadata } from './DiscriminatorMetadata';

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
  public readonly transformer: DocumentTransformer;
  public readonly parent?: ParentDefinition;
  public readonly discriminator?: DiscriminatorMetadata;

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
    this.transformer = DocumentTransformer.create(this);
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
    return this.transformer.toDB(model);
  }

  /**
   * Maps mongodb document(s) to a model.
   */
  fromDB(doc: Partial<T> | { [key: string]: any }): T {
    return this.transformer.fromDB(doc);
  }

  /**
   * Creates a model from model properties.
   */
  init(props: OptionalId<Partial<T>> | { [key: string]: any }): T {
    return this.transformer.init(props);
  }

  /**
   * Creates a model from model properties.
   */
  merge(model: T, props: Partial<T> | { [key: string]: any }): T {
    return this.transformer.merge(model, props);
  }
}
