import { AbstractDocumentMetadata } from '../metadata';
import { Constructor } from '../typings';
import { Hydrator } from './Hydrator';

const hydrators = new Map<Constructor, Hydrator>();

export class HydratorFactory {
  static create<T = any>(meta: AbstractDocumentMetadata<T>): Hydrator<T> {
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
