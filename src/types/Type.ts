import { Newable } from '../typings';
import { InvalidTypeError } from '../errors';

export abstract class Type<M = any, D = M> {
  private static readonly types = new Map<string, Type>();
  /**
   * Returns if document instance value is valid
   */
  abstract isValidJSValue(value: M | any): boolean;

  /**
   * Returns if database value is valid
   */
  abstract isValidDBValue(value: D): boolean;

  /**
   * Converts the document instance value to the database value.
   */
  protected abstract convertToDB(value: M | any): D;

  /**
   * Converts the database value to the document instance value.
   */
  protected abstract convertFromDB(value: D): M;

  /**
   * Populates the document instance value.
   */
  touch(value?: M | any): M {
    return value;
  }

  /**
   * Returns "convertToDB" result if value is defined.
   */
  toDB(value?: M | any): D {
    if (typeof value === 'undefined') {
      return;
    }

    return this.convertToDB(value);
  }

  /**
   * Returns "convertFromDB" result if value is defined.
   */
  fromDB(value?: D): M {
    if (typeof value === 'undefined') {
      return;
    }

    return this.convertFromDB(value);
  }

  protected assertValidJSValue(value: M | any) {
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
