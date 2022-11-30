import { Document, DocumentFields, Field, Id, UUIDType } from '../../src';
import { Binary } from 'mongodb';

@Document()
export class UUIDDocument {
  [DocumentFields]: { _id: Binary };

  @Id({ type: UUIDType, name: '_id' })
  id: string;

  @Field()
  name: string;
}
