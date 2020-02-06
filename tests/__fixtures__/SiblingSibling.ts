import { Document, Field, Parent } from '../../src';
import { Sibling } from './Sibling';
import { Parent as ParentDocument } from './Parent';

@Document()
export class SiblingSibling {
  @Parent()
  parent?: Sibling;

  @Field()
  name: string;

  get rootParent(): ParentDocument {
    return this.parent.parent;
  }
}
