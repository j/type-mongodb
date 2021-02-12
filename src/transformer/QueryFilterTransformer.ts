import { Condition, FilterQuery } from 'mongodb';
import {
  AbstractDocumentMetadata,
  EmbeddedDocumentMetadata,
  FieldMetadata
} from '../metadata';
import { isPlainObject } from '../utils';
import { Type } from '../types';
import { Newable } from '../typings';

// fields to exclude as query operators
const EXCLUDED_KEYS = new Set(['$ref', '$id', '$db']);

/**
 * `QueryFilterTransformer` transforms query filter field names and values.
 *
 * For example...
 *
 * Simple `_id` filter:
 *   a) { _id: "507f191e810c19729de860ea" }
 *   b) { _id: ObjectId("507f191e810c19729de860ea") }
 *
 * Custom UUID field with renamed field:
 *   a) { $all: [{ "reviews.0.uuid": "393967e0-8de1-11e8-9eb6-529269fb1459" }, ...] }
 *   b) { $all: [{ "reviews.0._id": Binary(...) }, ...] }
 */
export class QueryFilterTransformer<T = any> {
  static readonly cache = new Map<any, QueryFilterTransformer>();

  /**
   * Skips attempts to transform if there are no transformable fields for the document.
   */
  private isTransformable: boolean;

  static create<T = any, D extends Newable = Newable<T>>(
    metadata: AbstractDocumentMetadata<T, D>
  ): QueryFilterTransformer<T> {
    const { DocumentClass } = metadata;

    // create transformer if it does not exist
    if (!QueryFilterTransformer.cache.has(DocumentClass)) {
      QueryFilterTransformer.cache.set(
        DocumentClass,
        new QueryFilterTransformer<T>(metadata)
      );
    }

    return QueryFilterTransformer.cache.get(DocumentClass);
  }

  private constructor(private metadata: AbstractDocumentMetadata<T>) {
    const cache = new Map<EmbeddedDocumentMetadata, boolean>();

    // iterate over the document's fields to determine if it needs to transform
    // values or field names.
    this.isTransformable = [...this.metadata.fields.values()].some((field) => {
      const { embeddedMetadata, type, fieldName, propertyName } = field;

      if (embeddedMetadata) {
        if (cache.has(embeddedMetadata)) {
          cache.set(
            embeddedMetadata,
            embeddedMetadata.queryFilterTransformer.isTransformable
          );
        }

        return cache.get(embeddedMetadata);
      }

      if (type) {
        return true;
      }

      if (fieldName !== propertyName) {
        return true;
      }

      return false;
    });
  }

  transform(input: FilterQuery<T>): FilterQuery<T | any> {
    if (!this.isTransformable || typeof input !== 'object') {
      return input;
    }

    // assume query is a map of operators if it contains at least one
    // MongoDB operator.
    if (this.containsOperator(input)) {
      return Object.entries<FilterQuery<any>>(input).reduce(
        (output, [$op, condition]) => {
          output[$op] = this.transform(condition);

          return output;
        },
        {}
      );
    }

    return this.transformObject(input);
  }

  /**
   * Assumes the input is a direct queriable object.
   */
  transformObject(
    input: FilterQuery<any> | FilterQuery<any>
  ): FilterQuery<any> {
    if (Array.isArray(input)) {
      return input.map((i) => this.transformObject(i));
    }

    return Object.entries<FilterQuery<any>>(input).reduce(
      (output, [path, condition]) => {
        const transformed = this.transformPath(path, condition);
        output[transformed[0]] = transformed[1];

        return output;
      },
      {}
    );
  }

  /**
   * Determines if the path is a query against an embedded document, a direct field,
   * etc.
   */
  transformPath(
    path: string,
    condition: Condition<any>
  ): [string, Condition<any>] {
    let field: FieldMetadata;
    let embeddedMetadata: AbstractDocumentMetadata<any> = this.metadata;

    const fixedPaths: string[] = [];
    const paths = path.split('.');

    for (let i = 0; i < paths.length; i++) {
      const part = paths[i];
      // ignore:
      //   - dot notation array access: `{ "addresses.0.state": ... }`
      //   - paths that are potentially an operator
      //   - once embedded metadata after first iteration doesn't exist, just get remaining paths
      if (!isNaN(parseInt(part)) || part.startsWith('$') || !embeddedMetadata) {
        fixedPaths.push(part);
        continue;
      }

      field = embeddedMetadata.fields.get(part);
      embeddedMetadata = field?.embeddedMetadata;
      fixedPaths.push(field?.fieldName || part);
    }

    const fixedPath = fixedPaths.join('.');

    if (field?.type) {
      return [fixedPath, this.transformPathValue(field.type, condition)];
    }

    if (embeddedMetadata) {
      return [
        fixedPath,
        embeddedMetadata.queryFilterTransformer.transform(condition)
      ];
    }

    return [fixedPath, condition];
  }

  /**
   * Transforms the values for the given path.
   */
  transformPathValue(type: Type, value: Condition<any>): Condition<any> {
    if (!type) {
      return value;
    }

    // if path has a filter with other operators, transform them independently
    if (this.containsOperator(value)) {
      return Object.entries(value).reduce<Condition<any>>(
        (condition, [$op, value]) => {
          condition[$op] = this.transformPathValue(type, value);

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

  private isOperator(str: string): boolean {
    return str.startsWith('$') && !EXCLUDED_KEYS.has(str);
  }

  private containsOperator(object: any): boolean {
    return isPlainObject(object) && Object.keys(object).some(this.isOperator);
  }
}
