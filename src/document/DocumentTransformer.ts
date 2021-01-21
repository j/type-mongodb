import { DocumentClass, Newable } from '..';
import { FieldMetadata } from '../metadata/FieldMetadata';
import { AbstractDocumentMetadata } from '../metadata/AbstractDocumentMetadata';
import { OptionalId } from '../typings';
import { InternalError } from '../errors';

export type DocumentTransformerCompiledFunction = (
  target: any,
  source: any,
  parent?: any
) => any;

// simple helper to create unique variable names
let variableCount: number = 0;
function reserveVariable(name: string): string {
  return `${name}_${++variableCount}`;
}

export class DocumentTransformer<T = any, D extends Newable = DocumentClass> {
  private isCompiled: boolean = false;
  private compiledToDB: DocumentTransformerCompiledFunction;
  private compiledFromDB: DocumentTransformerCompiledFunction;
  private compiledInit: DocumentTransformerCompiledFunction;
  private compiledMerge: DocumentTransformerCompiledFunction;

  private constructor(private meta: AbstractDocumentMetadata<T, D>) {}

  static readonly transformers = new Map<any, DocumentTransformer>();

  static create<T = any, D extends Newable = DocumentClass>(
    meta: AbstractDocumentMetadata<T, D>
  ): DocumentTransformer<T, D> {
    // create transformer if it does not exist
    let transformer = DocumentTransformer.transformers.get(
      meta.DocumentClass
    ) as DocumentTransformer<T, D>;
    if (!transformer) {
      transformer = new DocumentTransformer<T, D>(meta);
    }

    DocumentTransformer.transformers.set(meta.DocumentClass, transformer);

    return transformer;
  }

  // compiles all of the transformers
  static compile(): void {
    DocumentTransformer.transformers.forEach((transformer) => {
      transformer.compile();
    });
  }

  public compile(): void {
    if (this.isCompiled) {
      return;
    }

    this.compiledToDB = this.createCompiler('toDB', false, true);
    this.compiledFromDB = this.createCompiler('fromDB', true, false);
    this.compiledInit = this.createCompiler('init', false, false);
    this.compiledMerge = this.createCompiler('merge', false, false);

    this.isCompiled = true;
  }

  public init(
    props: OptionalId<Partial<T>> | { [key: string]: any },
    parent?: any
  ): T {
    this.assertIsCompiled();

    props = props || {};

    if (this.meta.discriminator) {
      const { propertyName, mapping } = this.meta.discriminator;

      return props[propertyName] && mapping.has(props[propertyName])
        ? mapping.get(props[propertyName]).transformer.init(props, parent)
        : undefined;
    }

    return this.compiledInit(
      this.prepare(new this.meta.DocumentClass()),
      props,
      parent
    );
  }

  public merge(
    model: T,
    props: Partial<T> | { [key: string]: any },
    parent?: any
  ): T {
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

      const { DocumentClass, transformer } = mapping.get(props[propertyName]);

      // when a discriminator type changes, it is brand new, so lets create
      // it from scratch.
      return model instanceof DocumentClass
        ? transformer.merge(model, props, parent)
        : transformer.init(props, parent);
    }

    return this.compiledMerge(this.prepare(model), props, parent);
  }

  public fromDB(
    doc?: Partial<T> | { [key: string]: any },
    parent?: any
  ): T | void {
    this.assertIsCompiled();

    // don't attempt transforming invalid documents into models
    if (typeof doc !== 'object') {
      return doc;
    }

    if (this.meta.discriminator) {
      const { fieldName, mapping } = this.meta.discriminator;

      return doc[fieldName] && mapping.has(doc[fieldName])
        ? mapping.get(doc[fieldName]).transformer.fromDB(doc, parent)
        : undefined;
    }

    return this.compiledFromDB(
      Object.create(this.meta.DocumentClass.prototype),
      doc,
      parent
    );
  }

  public toDB(
    model: Partial<T> | { [key: string]: any }
  ): T & { [key: string]: any } {
    this.assertIsCompiled();

    // don't attempt transforming invalid models into documents
    if (typeof model !== 'object') {
      return model;
    }

    if (this.meta.discriminator) {
      const { propertyName, mapping } = this.meta.discriminator;

      return model[propertyName] && mapping.has(model[propertyName])
        ? mapping.get(model[propertyName]).transformer.toDB(model)
        : undefined;
    }

    return this.compiledToDB({}, this.prepare(model));
  }

  private createCompiler(
    type: 'toDB' | 'fromDB' | 'init' | 'merge',
    isFromDB: boolean,
    isToDB: boolean
  ): DocumentTransformerCompiledFunction {
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
            const ${createJsVar} = ${typeVar}.createJSValue();
            
            if (typeof ${createJsVar} !== 'undefined') {
              ${variable} = ${createJsVar};
            }
          }
        `;
      };

      const setTargetCode = (convertFn: string = 'convertToJSValue') => {
        return `
          if (typeof source["${accessor}"] !== 'undefined') {
            target["${setter}"] = ${typeVar}.${convertFn}(source["${accessor}"]);
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

      const transformerVar = reserveVariable(`${fieldName}_transformer`);
      context.set(transformerVar, DocumentTransformer.create(embeddedMetadata));

      const transformCode = (source: string, target: string = 'undefined') => {
        switch (type) {
          case 'toDB':
            return `${transformerVar}.toDB(${source})`;
          case 'fromDB':
            return `${transformerVar}.fromDB(${source}, target)`;
          case 'merge':
            return `${transformerVar}.merge(${target}, ${source}, target)`;
          case 'init':
            return `${transformerVar}.init(${source}, target)`;
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
    if (
      typeof object._id === 'undefined' &&
      typeof this.meta.idField !== 'undefined' &&
      this.meta.idField.shouldCreateJSValue
    ) {
      object._id = this.meta.idField.createJSValue();
    }

    return object;
  }

  private assertIsCompiled() {
    if (!this.isCompiled) {
      InternalError.throw('DocumentTransformers are not compiled');
    }
  }
}
