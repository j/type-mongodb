import { ObjectId } from 'mongodb';
import { Type } from './Type';

export class ObjectIdType extends Type<ObjectId> {
  touch(id?: string | ObjectId): ObjectId {
    return new ObjectId(id);
  }

  convertToDB(id: ObjectId): ObjectId {
    return new ObjectId(id);
  }

  convertFromDB(id: ObjectId): ObjectId {
    return new ObjectId(id);
  }

  isValidDBValue(id: ObjectId): boolean {
    return this.isValidJSValue(id);
  }

  isValidJSValue(id: ObjectId): boolean {
    return (
      typeof id === 'object' &&
      'toHexString' in id &&
      typeof id.toHexString === 'function'
    );
  }
}
