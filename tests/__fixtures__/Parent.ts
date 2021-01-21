import { Document, Id, Field } from '../../src';
import { ObjectId } from 'mongodb';
import { Sibling } from './Sibling';

@Document()
export class Parent {
  @Id()
  _id: ObjectId;

  @Field(() => Sibling)
  sibling: Sibling;

  @Field(() => [Sibling])
  siblings: Sibling[] = [];
}
