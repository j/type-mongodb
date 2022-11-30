import { Constructor } from '../typings';
import { EmbeddedDocumentMetadata } from './EmbeddedDocumentMetadata';
import { FieldDefinition } from './definitions';
import { Type } from '../types';
import { InternalError } from '../errors';

export interface FieldMetadataOpts<Model, Document>
  extends FieldDefinition<Model> {
  isEmbeddedArray?: boolean;
  embeddedType?: Constructor;
  embeddedMetadata?: EmbeddedDocumentMetadata<Model, Document>;
}

export class FieldMetadata<Model = any, Document = Model> {
  public readonly DocumentClass: Constructor<Model>;
  public readonly propertyName: string;
  public readonly fieldName: string;
  public readonly isId: boolean;
  public readonly embedded?: () => any;
  public readonly isEmbedded: boolean;
  public readonly isEmbeddedArray?: boolean;
  public readonly embeddedType?: Constructor;
  public readonly embeddedMetadata?: EmbeddedDocumentMetadata<Model, Document>;
  public readonly type: Type;
  public readonly typeIsArray: boolean;
  public readonly shouldCreateJSValue: boolean;

  constructor(opts: FieldMetadataOpts<Model, Document>) {
    this.DocumentClass = opts.DocumentClass;
    this.propertyName = opts.propertyName;
    this.fieldName = opts.fieldName;
    this.isId = opts.isId;
    this.embedded = opts.embedded;
    this.isEmbedded = opts.isEmbedded;
    this.isEmbeddedArray = opts.isEmbeddedArray;
    this.embeddedType = opts.embeddedType;
    this.embeddedMetadata = opts.embeddedMetadata;
    this.type = opts.type;
    this.typeIsArray = opts.typeIsArray;
    this.shouldCreateJSValue = opts.shouldCreateJSValue;

    if (this.type && !(this.type instanceof Type)) {
      InternalError.throw(`Invalid type for property "${this.propertyName}"`);
    }

    if (this.shouldCreateJSValue && !this.type) {
      InternalError.throw(
        `${this.constructor.name}.${this.propertyName} cannot have "create" be true without a valid "type"`
      );
    }
  }

  createJSValue(value?: any): any {
    return this.shouldCreateJSValue ? this.type.createJSValue(value) : value;
  }
}
