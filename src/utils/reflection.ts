import 'reflect-metadata';
import { Constructor } from '../typings';
import { ObjectIdType, Type } from '../types';
import { FieldDefinition } from 'src/metadata';

export function fieldToType(
  target: Record<any, any>,
  name: string,
  type?: Type | Constructor<Type>
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
