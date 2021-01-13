import { FilterQuery } from '../typings';
import { BaseError } from './BaseError';
import { DocumentMetadata } from '../metadata/DocumentMetadata';

export class DocumentNotFound extends BaseError {
  constructor(meta: DocumentMetadata, filter: FilterQuery<any>) {
    let message: string;

    if (
      filter &&
      Object.keys(filter).length === 1 &&
      typeof filter._id !== 'undefined'
    ) {
      message = `"${meta.name}" with id "${filter._id}" not found`;
    } else {
      message = `"${meta.name}" not found with criteria: '${JSON.stringify(
        filter
      )}'`;
    }

    super(message, false);
  }
}
