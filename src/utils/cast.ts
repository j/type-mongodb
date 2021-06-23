import { Filter, UpdateQuery } from 'mongodb';
import { AbstractDocumentMetadata, FieldMetadata } from '../metadata';
import { isPlainObject } from '../utils';
import { Type } from '../types';

export type CastInput<T> = Filter<T | any> | UpdateQuery<T | any>;

export type CastType = 'filter' | 'update';

export interface CastContext {
  readonly type: CastType;
  $op?: string;
}

/**
 * Cast field names & values from the Repository to MongoDB.
 *
 * For example...
 *
 * Simple `_id` filter:
 *   from) { _id: "507f191e810c19729de860ea" }
 *   to) { _id: ObjectId("507f191e810c19729de860ea") }
 *
 * Custom UUID field with renamed field:
 *   from) { $all: [{ "reviews.0.uuid": "393967e0-8de1-11e8-9eb6-529269fb1459" }, ...] }
 *   to) { $all: [{ "reviews.0._uuid": Binary(...) }, ...] }
 */

/**
 * `input` should be a valid MongoDB query filter or operator.
 */
export function cast<T, C extends CastInput<T>>(
  metadata: AbstractDocumentMetadata<T>,
  input: C,
  type: CastType
): C {
  if (typeof input !== 'object') {
    return input;
  }

  // don't cast pipeline updates
  if (type === 'update' && Array.isArray(input)) {
    return input;
  }

  return castAny(metadata, input, { type });
}

function castAny<T, C extends CastInput<T>>(
  metadata: AbstractDocumentMetadata<T>,
  input: C,
  context: CastContext
): C {
  if (typeof input !== 'object') {
    return input;
  }

  if (!containsOperator(input)) {
    return castObject(metadata, input, context);
  }

  // assume query is a map of operators if it contains at least one
  // MongoDB operator.
  return Object.entries(input).reduce((output, [$op, condition]) => {
    context.$op = $op;
    output[$op] = castAny(metadata, condition, context);

    return output;
  }, {}) as C;
}

/**
 * Assumes the input is a direct queryable object.
 */
function castObject<T = any>(
  metadata: AbstractDocumentMetadata<T>,
  input: any,
  context: CastContext
): any {
  if (Array.isArray(input)) {
    return input.map((i) => castObject(metadata, i, context));
  }

  return Object.entries<Filter<any>>(input).reduce(
    (output, [path, condition]) => {
      const casted = castPath(metadata, path, condition, context);
      output[casted[0]] = casted[1];

      return output;
    },
    {}
  );
}

/**
 * Determines if the path is a query against an embedded document, a direct field,
 * etc.
 */
function castPath<T = any>(
  metadata: AbstractDocumentMetadata<T>,
  path: string,
  condition: Filter<any>,
  context: CastContext
): [string, Filter<any>] {
  let field: FieldMetadata;
  let embeddedMetadata: AbstractDocumentMetadata<any> = metadata;

  const fixedPaths: string[] = [];
  const paths = path.split('.');

  for (let i = 0; i < paths.length; i++) {
    const part = paths[i];
    // ignore:
    //   - dot notation array access: `{ "addresses.0.state": ... }`
    //   - paths that are potentially an operator
    //   - once embedded metadata after first iteration doesn't exist, just get remaining paths
    if (!isNaN(parseInt(part)) || isOperator(part) || !embeddedMetadata) {
      fixedPaths.push(part);
      continue;
    }

    field = embeddedMetadata.fields.get(part);
    embeddedMetadata = field?.embeddedMetadata;
    fixedPaths.push(field?.fieldName || part);
  }

  const fixedPath = fixedPaths.join('.');

  if (field?.type) {
    return [fixedPath, castPathValue(field.type, condition, context)];
  }

  if (embeddedMetadata) {
    return [fixedPath, castAny(embeddedMetadata, condition, context)];
  }

  return [fixedPath, condition];
}

/**
 * Casts the values for the given path.
 */
function castPathValue(
  type: Type,
  value: Filter<any> | any,
  context: CastContext
): Filter<any> {
  const { $op } = context;

  if (!type || !shouldCastValues($op)) {
    return value;
  }

  // cast internal operator values ($each, $in, $gte, etc)
  if (containsOperator(value)) {
    return Object.entries(value).reduce<Filter<any>>(
      (condition, [$op, value]) => {
        context.$op = $op;
        condition[$op] = castPathValue(type, value, context);

        return condition;
      },
      {}
    );
  }

  try {
    return Array.isArray(value)
      ? value.map((c) => type.convertToDatabaseValue(c))
      : type.convertToDatabaseValue(value);
  } catch (err) {
    return value;
  }
}

function isOperator(str?: string): boolean {
  return typeof str === 'string' && str.startsWith('$');
}

function shouldCastValues($op?: string): boolean {
  if (!isOperator($op)) {
    return true;
  }

  return !['$pop', '$bit'].includes($op);
}

function containsOperator(object: any): boolean {
  return isPlainObject(object) && Object.keys(object).some(isOperator);
}
