import 'reflect-metadata';
import { Newable } from '../typings';
import { ObjectIdType, Type } from '../types';
import { FieldDefinition } from 'src/metadata';

export function fieldToType(
  target: Object,
  name: string,
  type?: Type | Newable<Type>
): Pick<FieldDefinition, 'type' | 'typeIsArray'> {
  const designType = Reflect.getMetadata('design:type', target, name);

  if (typeof type !== 'undefined') {
    return {
      type: type instanceof Type ? type : Type.getType(type),
      typeIsArray: designType === Array
    };
  }

  if (typeof designType?.name !== 'string') {
    return {
      type: undefined,
      typeIsArray: false
    };
  }

  switch (designType.name.toLowerCase()) {
    case 'objectid':
      return {
        type: Type.getType(ObjectIdType),
        typeIsArray: false
      };
  }
}
