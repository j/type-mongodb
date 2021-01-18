import { Newable } from '../typings';
import { ValidationError } from '../errors';

export enum Mode {
  DATABASE,
  JS
}

export class Type<JSType = any, DBType = JSType, ConvertibleTypes = JSType> {
  private static readonly types = new Map<string, Type>();

  /**
   * The name of the field type.
   */
  get name(): string {
    return 'raw';
  }

  /**
   * Creates the JS value.  Normally you want to support potential JSON values
   * to create the type's value from it's JSON representation.
   */
  createJSValue(value?: JSType | DBType | ConvertibleTypes): JSType {
    return value as JSType;
  }

  /**
   * Converts between the database/JS representation to the database representation.
   */
  convertToDatabaseValue(
    value?: JSType | DBType | ConvertibleTypes
  ): DBType | undefined {
    return value as DBType;
  }

  /**
   * Converts between the JS/database representation to the JS representation.
   */
  convertToJSValue(
    value?: JSType | DBType | ConvertibleTypes
  ): JSType | undefined {
    return value as JSType;
  }

  /**
   * Checks if JS representation is valid.
   */
  isValidJSValue(_value?: JSType | ConvertibleTypes): boolean {
    return true;
  }

  /**
   * Checks if database representation is valid.
   */
  isValidDatabaseValue(_value?: DBType | ConvertibleTypes): boolean {
    return true;
  }

  /**
   * Throws error if JS representation is invalid.
   */
  assertValidJSValue(value: JSType, mode: Mode = Mode.JS): void {
    if (!this.isValidJSValue(value)) {
      ValidationError.invalidType(this, value, mode);
    }
  }

  /**
   * Throws error if DB representation is invalid.
   */
  assertValidDatabaseValue(value: DBType, mode: Mode = Mode.DATABASE): void {
    if (!this.isValidDatabaseValue(value)) {
      ValidationError.invalidType(this, value, mode);
    }
  }

  /**
   * Returns or creates a type by the given constructor.
   */
  static getType<M, D>(Ctor: Newable<Type<M, D>>): Type<M, D> {
    const key = Ctor.name;

    if (!Type.types.has(key)) {
      Type.types.set(key, new Ctor());
    }

    return Type.types.get(key);
  }
}
