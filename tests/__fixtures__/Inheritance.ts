import { Document, Id, Field } from '../../src';
import { ObjectId } from 'mongodb';

export abstract class BaseBaseDocument {
  @Id()
  _id: ObjectId;
}

export abstract class BaseDocument extends BaseBaseDocument {
  @Field()
  base: string;
}

export abstract class BaseBaseSibling {
  @Field()
  baseBase: string;
}

export abstract class BaseSibling extends BaseBaseSibling {
  @Field()
  base: string;
}

export abstract class Sibling extends BaseSibling {
  @Field()
  field: string;
}

@Document()
export class Inheritance extends BaseDocument {
  @Field(() => Sibling)
  sibling: Sibling;
}
