import { Document, Field, Id, UUIDType } from '../../src';

@Document()
export class UUIDDocument {
  @Id({ type: UUIDType, name: '_id' })
  id: string;

  @Field()
  name: string;
}
