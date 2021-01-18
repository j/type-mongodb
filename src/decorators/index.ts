import 'reflect-metadata';
import {
  DiscriminatorDefinition,
  FieldDefinition,
  ParentDefinition
} from '../metadata/definitions';
import { definitionStorage } from '../utils/definitionStorage';
import { Newable } from '../typings';
import { Repository } from '../repository';
import { Type } from '../types';
import { fieldToType } from '../utils/reflection';
import { InternalError } from '../errors';

interface DocumentOptions {
  database?: string;
  collection?: string;
  extensions?: Record<any, any>;
  repository?: () => Newable<Repository<any>>;
}

export function Document(options: DocumentOptions = {}): ClassDecorator {
  return (target: any) => {
    definitionStorage.documents.set(target, {
      ...options,
      DocumentClass: target,
      repository: options.repository,
      database: options.database,
      collection: options.collection || target.name
    });
  };
}

interface FieldOptions {
  name?: string;
  type?: Newable<Type> | Type;
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

    addFieldDefinition(field, {
      ...options,
      DocumentClass: target.constructor,
      type: fieldToType(target, field, options.type),
      propertyName: field,
      fieldName: options.name || field,
      isEmbedded: typeof embedded !== 'undefined',
      embedded
    });
  };
}

function addFieldDefinition(field: string, def: FieldDefinition) {
  if (definitionStorage.fields.has(def.DocumentClass)) {
    definitionStorage.fields.get(def.DocumentClass).set(field, def);
  } else {
    definitionStorage.fields.set(def.DocumentClass, new Map([[field, def]]));
  }
}

export function Parent(): PropertyDecorator {
  return (target: any, propertyName: string) => {
    const meta: ParentDefinition = {
      DocumentClass: target.constructor,
      propertyName
    };

    if (definitionStorage.parents.has(meta.DocumentClass)) {
      InternalError.throw(
        `Parent already exists for "${target.constructor.name}"`
      );
    }

    definitionStorage.parents.set(meta.DocumentClass, meta);
  };
}

export interface AbstractDiscriminatorOptions {
  property: string;
}

export interface DiscriminatorOptions {
  value: string;
}

export function Discriminator(
  options: AbstractDiscriminatorOptions | DiscriminatorOptions
): ClassDecorator {
  return (target: any) => {
    if ((options as AbstractDiscriminatorOptions).property) {
      // this is the base abstract discriminator
      const opts = options as AbstractDiscriminatorOptions;

      const mapping: DiscriminatorDefinition = {
        DocumentClass: target,
        propertyName: opts.property,
        isMapped: true,
        map: {}
      };

      definitionStorage.discriminators.set(target, {
        ...(definitionStorage.discriminators.get(target) || {}),
        ...mapping
      });
    } else {
      const opts = options as DiscriminatorOptions;

      let definition: DiscriminatorDefinition;

      // locate abstract class
      let proto = Object.getPrototypeOf(target);
      while (proto && proto.prototype) {
        definition = definitionStorage.discriminators.get(proto);
        if (definition) {
          break;
        }

        proto = Object.getPrototypeOf(proto);
      }

      if (!definition) {
        InternalError.throw(
          `Discriminator value "${target.name}" does not have a properly mapped base "@Discriminator()"`
        );
      }

      definition.map[opts.value] = () => target;
    }
  };
}
