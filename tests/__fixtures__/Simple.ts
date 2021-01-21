import { Document, Id, Field } from '../../src';
import { ObjectId } from 'mongodb';

@Document()
export class Simple {
  @Id()
  _id: ObjectId;

  @Field()
  string: string;

  @Field()
  date: Date = new Date();

  @Field()
  boolean: boolean = true;

  unmapped?: string;
}

export function createSimple(): Simple {
  return Object.assign(new Simple(), {
    _id: new ObjectId(),
    string: 'foo',
    date: new Date('1986-12-05'),
    boolean: false
  });
}
