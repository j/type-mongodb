import { Newable } from '../typings';
import { BaseError } from './BaseError';

export class InvalidTypeError extends BaseError {
  constructor(type: Newable, value: any, mode: 'js' | 'db') {
    super(
      `The ${mode} value of "${value}" is invalid for type ${type.name}.`,
      false
    );
  }
}
