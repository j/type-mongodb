import { Newable } from '../typings';
import { InvalidTypeError } from '../errors';

export abstract class Type<M = any, D = M> {
  private static readonly types = new Map<string, Type>();
  /**
   * Returns if document instance value is valid
   */
  abstract isValidJSValue(value: M): boolean;

  /**
   * Returns if database value is valid
   */
  abstract isValidDBValue(value: D): boolean;

  /**
   * Converts the document instance value to the database value.
   */
  protected abstract convertToDB(value: M): D;

  /**
   * Converts the database value to the document instance value.
   */
  protected abstract convertFromDB(value: D): M;

  /**
   * Populates the document instance value.
   */
  touch(value?: M): M {
    return value;
  }

  /**
   * Returns "convertToDB" result if value is defined.
   */
  toDB(value: M): D {
    if (typeof value === 'undefined') {
      return;
    }

    this.assertValidJSValue(value);

    return this.convertToDB(value);
  }

  /**
   * Returns "convertFromDB" result if value is defined.
   */
  fromDB(value: D): M {
    if (typeof value === 'undefined') {
      return;
    }

    this.assertValidDBValue(value);

    return this.convertFromDB(value);
  }

  protected assertValidJSValue(value: M) {
    if (!this.isValidJSValue(value)) {
      throw new InvalidTypeError((this as any).constructor, value, 'js');
    }
  }

  protected assertValidDBValue(value: D) {
    if (!this.isValidDBValue(value)) {
      throw new InvalidTypeError((this as any).constructor, value, 'db');
    }
  }

  static getType<M, D>(Ctor: Newable<Type<M, D>>): Type<M, D> {
    const key = Ctor.name;

    if (!Type.types.has(key)) {
      Type.types.set(key, new Ctor());
    }

    return Type.types.get(key);
  }
}
