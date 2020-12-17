import { DocumentClass, Newable } from '..';
import { FieldMetadata } from '../metadata/FieldMetadata';
import { AbstractDocumentMetadata } from '../metadata/AbstractDocumentMetadata';
import { OptionalId } from '../types';

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

  public fromDB(doc: Partial<T> | { [key: string]: any }, parent?: any): T {
    this.assertIsCompiled();

    if (this.meta.discriminator) {
      const { fieldName, mapping } = this.meta.discriminator;

      return doc[fieldName] && mapping.has(doc[fieldName])
        ? mapping.get(doc[fieldName]).transformer.fromDB(doc, parent)
        : undefined;
    }

    return this.compiledFromDB(new this.meta.DocumentClass(), doc, parent);
  }

  public toDB(
    model: Partial<T> | { [key: string]: any }
  ): T & { [key: string]: any } {
    this.assertIsCompiled();

    if (this.meta.discriminator) {
      const { propertyName, mapping } = this.meta.discriminator;

      return model[propertyName] && mapping.has(model[propertyName])
        ? mapping.get(model[propertyName]).transformer.toDB(model)
        : undefined;
    }

    return this.compiledToDB({}, this.prepare(model));
  }

  private createCompiler(
    transformerFnName: 'toDB' | 'fromDB' | 'init' | 'merge',
    isFromDB: boolean,
    isToDB: boolean
  ): DocumentTransformerCompiledFunction {
    const context = new Map<any, any>();

    const has = (accessor: string): string => {
      return `(source && "${accessor}" in source)`;
    };

    const getComparator = (
      fieldMetadata: FieldMetadata,
      accessor: string,
      setter: string
    ): string => {
      const {
        embeddedMetadata,
        fieldName,
        isEmbeddedArray,
        isEmbedded
      } = fieldMetadata;

      // simple getter/setter
      if (!isEmbedded) {
        return `
          if (${has(accessor)}) {
            target["${setter}"] = source["${accessor}"];
          }
        `;
      }

      const embeddedTransformer = DocumentTransformer.create(embeddedMetadata);
      const transformerFnVar = reserveVariable(`${fieldName}_transformer`);
      const initTransformerFnVar = reserveVariable(
        `${fieldName}_init_transformer`
      );
      const transformerFn = embeddedTransformer[transformerFnName];

      context.set(transformerFnVar, transformerFn.bind(embeddedTransformer));
      context.set(
        initTransformerFnVar,
        embeddedTransformer.init.bind(embeddedTransformer)
      );

      if (isEmbeddedArray) {
        return `
          if (${has(accessor)} && Array.isArray(source["${accessor}"])) {
            ${
              transformerFnName === 'merge'
                ? `target["${setter}"] = source["${accessor}"].map(v => ${transformerFnVar}(undefined, v, target));`
                : `target["${setter}"] = source["${accessor}"].map(v => ${transformerFnVar}(v, target));`
            }
          }
        `;
      }

      return `
        if (${has(accessor)}) {
          ${
            transformerFnName === 'merge'
              ? `target["${setter}"] = ${transformerFnVar}(target["${setter}"], source["${accessor}"], target);`
              : `target["${setter}"] = ${transformerFnVar}(source["${accessor}"], target);`
          }
        }
      `;
    };

    const props: string[] = [];
    for (const fieldMetadata of this.meta.fields.values()) {
      const { fieldName, propertyName } = fieldMetadata;

      const accessor = isFromDB ? fieldName : propertyName;
      const setter = isToDB ? fieldName : propertyName;

      props.push(getComparator(fieldMetadata, accessor, setter));
    }

    const parentMapper = () => {
      if (isToDB || !this.meta.parent) {
        return '';
      }

      return `
        target["${this.meta.parent.propertyName}"] = parent;
      `;
    };

    const functionCode = `
        return function(target, source, parent) {
          ${props.join('\n')}
          
          ${parentMapper()}

          return target;
        }
        `;

    const compiled = new Function(...context.keys(), functionCode);

    return compiled(...context.values());
  }

  private prepare<T = any>(object: any): T {
    if (this.meta.hasId()) {
      object._id = this.meta.id(object._id);
    }

    return object;
  }

  private assertIsCompiled() {
    if (!this.isCompiled) {
      throw new Error('DocumentTransformers are not compiled');
    }
  }
}
