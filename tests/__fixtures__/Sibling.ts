import { Document, Field, Parent } from '../../src';
import { Parent as ParentDocument } from './Parent';
import { SiblingSibling } from './SiblingSibling';

@Document()
export class Sibling {
  @Parent()
  parent?: ParentDocument;

  @Field()
  name: string;

  @Field(() => SiblingSibling)
  sibling: SiblingSibling;

  @Field(() => [SiblingSibling])
  siblings: SiblingSibling[] = [];
}
