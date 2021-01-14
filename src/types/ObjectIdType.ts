import { ObjectId } from 'mongodb';
import { Type } from './Type';

export class ObjectIdType extends Type<ObjectId, ObjectId> {
  touch(id?: string | ObjectId): ObjectId {
    return new ObjectId(id);
  }

  isValidDBValue(id: ObjectId | string): boolean {
    return ObjectId.isValid(id);
  }

  isValidJSValue(id: ObjectId | string): boolean {
    return ObjectId.isValid(id);
  }

  protected convertToDB(id: ObjectId | string): ObjectId {
    this.assertValidJSValue(id);

    return new ObjectId(id);
  }

  protected convertFromDB(id: ObjectId): ObjectId {
    this.assertValidDBValue(id);

    return new ObjectId(id);
  }
}
