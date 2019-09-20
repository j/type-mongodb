import { FieldDefinition } from '../metadata/definitions';
import { definitionStorage } from '../utils/definitionStorage';
import { Newable } from '../common';
import { Repository } from '../repository';

interface DocumentOptions {
  connection?: string;
  database?: string;
  collection?: string;
  extensions?: Record<any, any>;
  repository?: Newable<Repository<any>>;
}

export function Document(options: DocumentOptions = {}): ClassDecorator {
  return (target: any) => {
    definitionStorage.documents.set(target, {
      ...options,
      DocumentClass: target,
      RepositoryClass: options.repository || Repository,
      connection: options.connection || 'default',
      database: options.database,
      collection: options.collection || target.name
    });
  };
}

interface FieldOptions {
  extensions?: Record<any, any>;
}

export function Field(options?: FieldOptions): PropertyDecorator;
export function Field(
  embedded?: () => any,
  options?: FieldOptions
): PropertyDecorator;
export function Field(
  embeddedOrOptions?: (() => any) | FieldOptions,
  options?: FieldOptions
): PropertyDecorator {
  return (target: any, field: string) => {
    let embedded: () => any;

    if (typeof embeddedOrOptions === 'function') {
      embedded = embeddedOrOptions;
      options = options || {};
    } else {
      options = embeddedOrOptions || {};
    }

    const meta: FieldDefinition = {
      ...options,
      DocumentClass: target.constructor,
      fieldName: field,
      isEmbedded: typeof embedded !== 'undefined',
      embedded
    };

    if (definitionStorage.fields.has(meta.DocumentClass)) {
      definitionStorage.fields.get(meta.DocumentClass).set(field, meta);
    } else {
      definitionStorage.fields.set(
        meta.DocumentClass,
        new Map([[field, meta]])
      );
    }
  };
}
