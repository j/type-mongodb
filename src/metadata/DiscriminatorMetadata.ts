import { DiscriminatorDefinition } from './definitions';
import { AbstractDocumentMetadata } from './AbstractDocumentMetadata';
import { Constructor } from '../typings';
import { definitionStorage } from '../utils';
import { InternalError } from '../errors';

export class DiscriminatorMetadata {
  readonly DocumentClass: Constructor;
  readonly propertyName: string;
  readonly fieldName: string;

  constructor(
    public readonly definition: DiscriminatorDefinition,
    public readonly mapping: Map<string, AbstractDocumentMetadata<any>>
  ) {
    this.DocumentClass = definition.DocumentClass;
    this.propertyName = definition.propertyName;

    DiscriminatorMetadata.assertValid(definition);

    // get fieldName from fields storage
    this.fieldName = definitionStorage.fields
      .get(this.DocumentClass)
      .get(this.propertyName).fieldName;
  }

  static assertValid(definition: DiscriminatorDefinition) {
    const { DocumentClass, propertyName } = definition;

    const fieldsDef = definitionStorage.fields.get(DocumentClass);
    if (!fieldsDef || !fieldsDef.has(propertyName)) {
      InternalError.throw(
        `@Discriminator() classes must have a decorated @Field() property with name "${propertyName}"`
      );
    }
  }
}
