import { DiscriminatorDefinition } from './definitions';
import { AbstractDocumentMetadata } from './AbstractDocumentMetadata';
import { DocumentClass } from '../typings';
import { definitionStorage } from '../utils/definitionStorage';

export class DiscriminatorMetadata {
  readonly DocumentClass: DocumentClass;
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
      throw new Error(
        `@Discriminator() classes must have a decorated @Field() property with name "${propertyName}"`
      );
    }
  }
}
