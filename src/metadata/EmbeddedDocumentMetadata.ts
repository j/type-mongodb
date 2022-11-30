import { AbstractDocumentMetadata } from './AbstractDocumentMetadata';
import { WithDocumentFields } from '../typings';

/**
 * DocumentMetadata contains all the needed info for Document classes.
 */
export class EmbeddedDocumentMetadata<
  Model = any,
  Document = WithDocumentFields<Model>
> extends AbstractDocumentMetadata<Model, Document> {
  isRoot(): boolean {
    return false;
  }
}
