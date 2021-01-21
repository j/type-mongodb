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
  public readonly shouldCreateJSValue: boolean;

  constructor(opts: FieldMetadataOpts) {
    this.prepareOpts(opts);

    this.DocumentClass = opts.DocumentClass;
    this.propertyName = opts.propertyName;
    this.fieldName = opts.fieldName;
    this.embedded = opts.embedded;
    this.isEmbedded = opts.isEmbedded;
    this.isEmbeddedArray = opts.isEmbeddedArray;
    this.embeddedType = opts.embeddedType;
    this.embeddedMetadata = opts.embeddedMetadata;
    this.type = opts.type;
    this.shouldCreateJSValue = this.type ? opts.create === true : false;

    if (this.type && !(this.type instanceof Type)) {
      InternalError.throw(`Invalid type for property "${this.propertyName}"`);
    }
  }

  createJSValue(value?: any): any {
    return this.shouldCreateJSValue ? this.type.createJSValue(value) : value;
  }

  private prepareOpts(opts: FieldMetadataOpts): void {
    // don't allow "create" option with type is not set
    if (
      typeof opts.type === 'undefined' &&
      typeof opts.create !== 'undefined'
    ) {
      InternalError.throw(
        `${opts.DocumentClass.name} document cannot use "create" field option without a "type"`
      );
    }

    // force "_id" fields to auto-create values
    if (opts.fieldName === '_id' && typeof opts.type !== 'undefined') {
      opts.create = true;
    }
    // don't auto-create type values by default
    else if (
      typeof opts.type !== 'undefined' &&
      typeof opts.create === 'undefined'
    ) {
      opts.create = false;
    }
  }
}
