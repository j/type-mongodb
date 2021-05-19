import { Filter } from 'mongodb';
import { DocumentMetadata } from '../metadata';
import { Mode, Type } from '../types';

export class InternalError extends Error {
  public name: string = 'InternalError';

  constructor(
    message: string,
    public metadata: Record<string, any>,
    public internalMetadata: Record<string, any>
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.metadata = this.metadata || {};
    this.internalMetadata = this.internalMetadata || {};
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      metadata: this.metadata
    };
  }

  static throw(
    message: string,
    metadata?: Record<string, any>,
    internalMetadata?: Record<string, any>
  ): void {
    throw new InternalError(message, metadata, internalMetadata);
  }
}

export class ValidationError extends Error {
  public name: string = 'ValidationError';

  constructor(
    message: string,
    public metadata?: Record<string, any>,
    public internalMetadata?: Record<string, any>
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.metadata = this.metadata || {};
    this.internalMetadata = this.internalMetadata || {};
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      metadata: this.metadata
    };
  }

  static throw(
    message: string,
    metadata?: Record<string, any>,
    internalMetadata?: Record<string, any>
  ): void {
    throw new ValidationError(message, metadata, internalMetadata);
  }

  static invalidType(type: Type, value: any, mode: Mode) {
    this.throw(`Invalid ${type.name}`, {
      value,
      mode: mode === Mode.DATABASE ? 'database' : 'js'
    });
  }

  static documentNotFound(meta: DocumentMetadata, filter: Filter<any>) {
    this.throw(`"${meta.name}" not found`, {
      code: 'DOCUMENT_NOT_FOUND',
      filter
    });
  }
}
