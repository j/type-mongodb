import { FieldsOf } from '../common/types';
import { BaseDocumentMetadata } from './BaseDocumentMetadata';

/**
 * DocumentMetadata contains all the needed info for Document classes.
 */
export class EmbeddedDocumentMetadata<
  M = any,
  D = FieldsOf<M>
> extends BaseDocumentMetadata<M, D> {}
