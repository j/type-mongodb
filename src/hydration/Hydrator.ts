import { OptionalId } from 'mongodb';
import { HydratorFactory } from './HydratorFactory';
import { AbstractDocumentMetadata, FieldMetadata } from '../metadata';
import { InternalError } from '../errors';
import { PartialDeep } from '../typings';

// simple helper to create unique variable names
let variableCount: number = 0;
function reserveVariable(name: string): string {
  return `${name}_${++variableCount}`;
}

export type CompiledHydrator = (target: any, source: any, parent?: any) => any;

interface CompiledHydrators {
  toDB?: CompiledHydrator;
  fromDB?: CompiledHydrator;
  init?: CompiledHydrator;
  merge?: CompiledHydrator;
}

export class Hydrator<T = any> {
  private compiled?: CompiledHydrators;

  constructor(private meta: AbstractDocumentMetadata<T>) {}

  get isCompiled(): boolean {
    return typeof this.compiled === 'object';
  }

  public compile(): void {
    if (this.isCompiled) {
      return;
    }

    this.compiled = {
      toDB: this.compileHydrator('toDB', false, true),
      fromDB: this.compileHydrator('fromDB', true, false),
      init: this.compileHydrator('init', false, false),
      merge: this.compileHydrator('merge', false, false)
    };
  }

  public init(props: PartialDeep<T>, parent?: any): T {
    this.assertIsCompiled();

    props = props || ({} as PartialDeep<T>);

    if (this.meta.discriminator) {
      const { propertyName, mapping } = this.meta.discriminator;

      return props[propertyName] && mapping.has(props[propertyName])
        ? mapping.get(props[propertyName]).hydrator.init(props, parent)
        : undefined;
    }

    return this.compiled.init(
      this.prepare(new this.meta.DocumentClass()),
      props,
      parent
    );
  }

  public merge(model: T, props: PartialDeep<T>, parent?: any): T {
    this.assertIsCompiled();

    if (!model) {
      return this.init(props, parent);
    }

    model = this.prepare(model);

    if (this.meta.discriminator) {
      const { propertyName, mapping } = this.meta.discriminator;

      if (!props[propertyName] || !mapping.has(props[propertyName])) {
        return;
      }

      const { DocumentClass, hydrator } = mapping.get(props[propertyName]);

      // when a discriminator type changes, it is brand new, so lets create
      // it from scratch.
      return model instanceof DocumentClass
        ? hydrator.merge(model, props, parent)
        : hydrator.init(props, parent);
    }

    return this.compiled.merge(this.prepare(model), props, parent);
  }

  public fromDB(doc?: Record<string, any>, parent?: any): T {
    this.assertIsCompiled();

    // don't attempt transforming invalid documents into models
    if (typeof doc !== 'object') {
      return doc;
    }

    if (this.meta.discriminator) {
      const { fieldName, mapping } = this.meta.discriminator;

      return doc[fieldName] && mapping.has(doc[fieldName])
        ? mapping.get(doc[fieldName]).hydrator.fromDB(doc, parent)
        : undefined;
    }

    return this.compiled.fromDB(
      Object.create(this.meta.DocumentClass.prototype),
      doc,
      parent
    );
  }

  public toDB(model: T): OptionalId<any> {
    this.assertIsCompiled();

    // don't attempt hydrating invalid models into documents
    if (typeof model !== 'object') {
      return model;
    }

    if (this.meta.discriminator) {
      const { propertyName, mapping } = this.meta.discriminator;

      return model[propertyName] && mapping.has(model[propertyName])
        ? mapping.get(model[propertyName]).hydrator.toDB(model)
        : undefined;
    }

    return this.compiled.toDB({}, model);
  }

  private compileHydrator(
    type: 'toDB' | 'fromDB' | 'init' | 'merge',
    isFromDB: boolean,
    isToDB: boolean
  ): CompiledHydrator {
    const context = new Map<any, any>();

    // gets the code for computing field values
    const fieldCode = ({
      fieldMetadata,
      accessor,
      setter
    }: {
      fieldMetadata: FieldMetadata;
      accessor: string;
      setter: string;
    }) => {
      const { fieldName, shouldCreateJSValue } = fieldMetadata;

      // use raw value if field does not have a "type"
      if (!fieldMetadata.type) {
        return `
          if (typeof source["${accessor}"] !== 'undefined') {
            target["${setter}"] = source["${accessor}"];
          }
        `;
      }

      const createJsVar = reserveVariable(`${fieldName}_new_value`);
      const typeVar = reserveVariable(`${fieldName}_type`);
      context.set(typeVar, fieldMetadata.type);

      const createJSValueCode = (variable: string) => {
        if (!shouldCreateJSValue) {
          return '';
        }

        return `
          if (typeof ${variable} === 'undefined') {
            ${
              fieldMetadata.typeIsArray
                ? `const ${createJsVar} = [${typeVar}.createJSValue()];`
                : `const ${createJsVar} = ${typeVar}.createJSValue();`
            }
            
            if (typeof ${createJsVar} !== 'undefined') {
              ${variable} = ${createJsVar};
            }
          }
        `;
      };

      const setTargetCode = (convertFn: string = 'convertToJSValue') => {
        return `
          if (typeof source["${accessor}"] !== 'undefined') {
            if (Array.isArray(source["${accessor}"])) {
              target["${setter}"] = source["${accessor}"].map(v => ${typeVar}.${convertFn}(v));
            } else {
              target["${setter}"] = ${typeVar}.${convertFn}(source["${accessor}"]);
            }
          }
        `;
      };

      switch (type) {
        case 'toDB':
          return `
            ${createJSValueCode(`source["${accessor}"]`)}
            ${setTargetCode('convertToDatabaseValue')}
          `;
        case 'fromDB':
          return setTargetCode();
        case 'merge':
          return `
            ${createJSValueCode(`target["${setter}"]`)}
            ${setTargetCode()}
          `;
        case 'init':
          return `
            ${createJSValueCode(`source["${accessor}"]`)}
            ${setTargetCode()}
          `;
      }
    };

    // gets the code for computing embedded document values
    const embeddedCode = ({
      fieldMetadata,
      accessor,
      setter
    }: {
      fieldMetadata: FieldMetadata;
      accessor: string;
      setter: string;
    }) => {
      const { embeddedMetadata, isEmbeddedArray, fieldName } = fieldMetadata;

      // bypasses null & undefined
      const template = (code: string) => {
        return `
          // bypass null & undefined values
          if (typeof source["${accessor}"] === 'undefined') {
            // ignore undefined values
          } else if (source["${accessor}"] === null) {
            target["${setter}"] = null;
          } else {
            ${code}
          }
        `;
      };

      const hydratorVar = reserveVariable(`${fieldName}_hydrator`);
      context.set(hydratorVar, HydratorFactory.create(embeddedMetadata));

      const transformCode = (source: string, target: string = 'undefined') => {
        switch (type) {
          case 'toDB':
            return `${hydratorVar}.toDB(${source})`;
          case 'fromDB':
            return `${hydratorVar}.fromDB(${source}, target)`;
          case 'merge':
            return `${hydratorVar}.merge(${target}, ${source}, target)`;
          case 'init':
            return `${hydratorVar}.init(${source}, target)`;
        }
      };

      if (isEmbeddedArray) {
        return template(`
          if (Array.isArray(source["${accessor}"])) {
            target["${setter}"] = source["${accessor}"].map(value => ${transformCode(
          'value'
        )});
          }
        `);
      }

      return template(
        `target["${setter}"] = ${transformCode(
          `source["${accessor}"]`,
          `target["${setter}"]`
        )};`
      );
    };

    const props: string[] = [];
    for (const fieldMetadata of this.meta.fields.values()) {
      const { fieldName, propertyName, isEmbedded } = fieldMetadata;
      const opts = {
        fieldMetadata,
        accessor: isFromDB ? fieldName : propertyName,
        setter: isToDB ? fieldName : propertyName
      };

      props.push(isEmbedded ? embeddedCode(opts) : fieldCode(opts));
    }

    const compiled = new Function(
      ...context.keys(),
      `
      return function(target, source, parent) {
        let currentValue;
        
        if (source) {
          ${props.join('\n')}
        }
        
        ${
          /* parent mapping */
          !isToDB && this.meta.parent
            ? `        target["${this.meta.parent.propertyName}"] = parent;`
            : ''
        }

        return target;
      }
    `
    );

    return compiled(...context.values());
  }

  /**
   * Initializes "_id" field if it's a valid type.
   */
  private prepare<T = any>(object: any): T {
    const idField = this.meta.idField;

    if (typeof idField !== 'undefined' && idField.shouldCreateJSValue) {
      const idProp = idField.propertyName;

      if (typeof object[idProp] === 'undefined') {
        object[idProp] = this.meta.idField.createJSValue();
      }
    }

    return object;
  }

  private assertIsCompiled() {
    if (!this.isCompiled) {
      InternalError.throw('Hydrators are not compiled');
    }
  }
}
