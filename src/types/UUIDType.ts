import { Binary } from 'mongodb';
import { v4, stringify, parse, validate } from 'uuid';
import { Type } from './Type';

export class UUIDType extends Type<string, Binary> {
  get name(): string {
    return 'UUID';
  }

  createJSValue(uuid?: string): string {
    if (typeof uuid === 'undefined') {
      return v4();
    }

    this.assertValidJSValue(uuid);

    return uuid;
  }

  convertToDatabaseValue(uuid?: Binary | string): Binary | undefined {
    if (
      typeof uuid === 'undefined' ||
      this.isValidDatabaseValue(uuid as Binary)
    ) {
      return uuid as Binary;
    }

    this.assertValidJSValue(uuid as string);

    return new Binary(
      Buffer.from(parse(uuid as string) as Buffer),
      Binary.SUBTYPE_UUID
    );
  }

  convertToJSValue(uuid?: Binary): string | undefined {
    if (typeof uuid === 'undefined') {
      return;
    }

    if (typeof uuid === 'string') {
      this.assertValidJSValue(uuid);

      return uuid as string;
    }

    this.assertValidDatabaseValue(uuid);

    return stringify(uuid.buffer);
  }

  isValidDatabaseValue(uuid: Binary): boolean {
    return uuid && uuid.sub_type === Binary.SUBTYPE_UUID;
  }

  isValidJSValue(uuid: string): boolean {
    return typeof uuid === 'string' && validate(uuid);
  }
}
