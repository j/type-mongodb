import { Binary } from 'mongodb';
import { v4, stringify, parse, validate } from 'uuid';
import { Type } from './Type';

export class UUIDType extends Type<string, Binary> {
  touch(uuid?: string): string {
    if (typeof uuid === 'undefined') {
      return v4();
    }

    this.assertValidJSValue(uuid);

    return uuid;
  }

  isValidDBValue(uuid: Binary): boolean {
    return uuid && uuid.sub_type === Binary.SUBTYPE_UUID;
  }

  isValidJSValue(uuid: string): boolean {
    return typeof uuid === 'string' && validate(uuid);
  }

  protected convertToDB(uuid: string): Binary {
    this.assertValidJSValue(uuid);

    return new Binary(Buffer.from(parse(uuid)), Binary.SUBTYPE_UUID);
  }

  protected convertFromDB(uuid: Binary): string {
    this.assertValidDBValue(uuid);

    return stringify(uuid.buffer);
  }
}
