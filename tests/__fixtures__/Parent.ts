import { Document, Field } from '../../src';
import { ObjectId } from 'mongodb';
import { Sibling } from './Sibling';

@Document()
export class Parent {
  @Field()
  _id: ObjectId;

  @Field(() => Sibling)
  sibling: Sibling;

  @Field(() => [Sibling])
  siblings: Sibling[] = [];
}
