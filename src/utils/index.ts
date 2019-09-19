import { TypeMongoError } from '../errors';

export const builtins = [String, Number, Date, Boolean];

export function isBuiltin(type: any) {
  if (typeof type === 'function' && typeof type.isValid === 'function') {
    return true;
  }

  return builtins.includes(type);
}

export function assertNotBuiltIn(type: any) {
  if (isBuiltin(type)) {
    throw new TypeMongoError(
      `No need to set field type on for: ObjectId, ${builtins
        .map(type => type.name)
        .join(', ')}`
    );
  }
}
