import { Newable } from '../typings';
import { EmbeddedDocumentMetadata } from './EmbeddedDocumentMetadata';
import { FieldDefinition } from './definitions';
import { Type } from '../types';
import { InternalError } from '../errors';

export interface FieldMetadataOpts<T = any> extends FieldDefinition<T> {
  isEmbeddedArray?: boolean;
  embeddedType?: Newable;
  embeddedMetadata?: EmbeddedDocumentMetadata;
}

export class FieldMetadata<T = any> {
  public readonly DocumentClass: Newable<T>;
  public readonly propertyName: string;
  public readonly fieldName: string;
  public readonly database: string;
  public readonly embedded?: () => any;
  public readonly isEmbedded: boolean;
  public readonly isEmbeddedArray?: boolean;
  public readonly embeddedType?: Newable;
  public readonly embeddedMetadata?: EmbeddedDocumentMetadata;
  public readonly type: Type;

  constructor(opts: FieldMetadataOpts) {
    this.DocumentClass = opts.DocumentClass;
    this.propertyName = opts.propertyName;
    this.fieldName = opts.fieldName;
    this.embedded = opts.embedded;
    this.isEmbedded = opts.isEmbedded;
    this.isEmbeddedArray = opts.isEmbeddedArray;
    this.embeddedType = opts.embeddedType;
    this.embeddedMetadata = opts.embeddedMetadata;
    this.type = opts.type;

    if (this.type && !(this.type instanceof Type)) {
      InternalError.throw(`Invalid type for property "${this.propertyName}"`);
    }
  }

  createJSValue(value?: any): any {
    return this.type ? this.type.createJSValue(value) : value;
  }
}
