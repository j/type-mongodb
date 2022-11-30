import { AbstractDocumentMetadata } from '../metadata';
import { Constructor, WithDocumentFields } from '../typings';
import { Hydrator } from './Hydrator';

const hydrators = new Map<Constructor, Hydrator<any, any>>();

export class HydratorFactory {
  static create<Model = any, Document = WithDocumentFields<Model>>(
    meta: AbstractDocumentMetadata<Model, Document>
  ): Hydrator<Model, Document> {
    const { DocumentClass } = meta;

    if (!hydrators.has(DocumentClass)) {
      hydrators.set(DocumentClass, new Hydrator(meta));
    }

    return hydrators.get(DocumentClass);
  }

  static compile(): void {
    hydrators.forEach((hydrator) => hydrator.compile());
  }
}
