import 'reflect-metadata';
import { Newable } from '../typings';
import { ObjectIdType, Type } from '../types';

export function fieldToType(
  target: Object,
  name: string,
  type?: Type | Newable<Type>
): Type | undefined {
  if (typeof type !== 'undefined') {
    return type instanceof Type ? type : Type.getType(type);
  }

  const designType = Reflect.getMetadata('design:type', target, name);
  if (typeof designType?.name !== 'string') {
    return;
  }

  switch (designType.name.toLowerCase()) {
    case 'objectid':
      return Type.getType(ObjectIdType);
  }
}
