import { ObjectId } from 'mongodb';
import { Type } from './Type';

export class ObjectIdType extends Type<ObjectId, ObjectId, string> {
  get name(): string {
    return 'ObjectId';
  }

  createJSValue(id?: ObjectId | string): ObjectId {
    if (typeof id === 'undefined') {
      return new ObjectId();
    }

    this.assertValidJSValue(id as ObjectId);

    return new ObjectId(id);
  }

  convertToDatabaseValue(id?: ObjectId | string): ObjectId | undefined {
    if (typeof id === 'undefined') {
      return;
    }

    this.assertValidJSValue(id as ObjectId);

    return new ObjectId(id);
  }

  convertToJSValue(id: ObjectId): ObjectId | undefined {
    if (typeof id === 'undefined') {
      return;
    }

    this.assertValidDatabaseValue(id);

    return new ObjectId(id);
  }

  isValidDatabaseValue(id: ObjectId | string): boolean {
    return ObjectId.isValid(id);
  }

  isValidJSValue(id: ObjectId | string): boolean {
    return ObjectId.isValid(id);
  }
}
