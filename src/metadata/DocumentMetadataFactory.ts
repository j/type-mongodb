import { DocumentMetadata } from './DocumentMetadata';
import { FieldMetadata } from './FieldMetadata';
import { Constructor } from '../typings';
import { definitionStorage } from '../utils';
import { DocumentManager } from '../DocumentManager';
import { EmbeddedDocumentMetadata } from './EmbeddedDocumentMetadata';
import {
  AbstractDocumentMetadata,
  FieldsMetadata
} from './AbstractDocumentMetadata';
import { Repository } from '../repository';
import { DiscriminatorMetadata } from './DiscriminatorMetadata';
import { ParentDefinition } from './definitions';
import { InternalError } from '../errors';

/**
 * DocumentMetadataFactory builds and validates all the Document's metadata.
 */
export class DocumentMetadataFactory {
  public loadedDocumentMetadata: Map<
    Constructor,
    DocumentMetadata<any>
  > = new Map();
  public loadedEmbeddedDocumentMetadata: Map<
    Constructor,
    EmbeddedDocumentMetadata<any>
  > = new Map();
  public loadedDiscriminatorMetadata: Map<
    Constructor,
    DiscriminatorMetadata
  > = new Map();

  public manager: DocumentManager;

  private isBuilt: boolean = false;

  constructor(public readonly documents: Constructor[]) {}

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  async build(manager: DocumentManager) {
    if (this.isBuilt) {
      InternalError.throw('DocumentMetadata already built');
    }

    this.manager = manager;

    await this.buildDocuments();

    this.isBuilt = true;
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getMetadataFor<T>(DocumentClass: Constructor<T>): DocumentMetadata<T> {
    this.assertMetadataIsBuilt();

    const meta = this.loadedDocumentMetadata.get(DocumentClass);

    if (!meta) {
      InternalError.throw(
        `DocumentMetadata for class "${DocumentClass.name}" does not exist`
      );
    }

    return meta;
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getEmbeddedMetadataFor<T>(
    EmbeddedDocumentClass: Constructor<T>
  ): EmbeddedDocumentMetadata<T> {
    this.assertMetadataIsBuilt();

    const meta = this.loadedEmbeddedDocumentMetadata.get(EmbeddedDocumentClass);

    if (!meta) {
      InternalError.throw(
        `EmbeddedDocumentMetadata for class "${EmbeddedDocumentClass.name}" does not exist`
      );
    }

    return meta;
  }

  /**
   * Filters metadata by given criteria.
   */
  filterMetadata<T = any>(
    filter: (value: DocumentMetadata) => boolean
  ): DocumentMetadata<T>[] {
    return Array.from(this.loadedDocumentMetadata.values()).filter(filter);
  }

  /**
   * Filters metadata by given criteria.
   */
  map<T = any>(
    fn: (value: DocumentMetadata, index: number, array: DocumentMetadata[]) => T
  ): T[] {
    return Array.from(this.loadedDocumentMetadata.values()).map(fn);
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected assertMetadataIsBuilt() {
    if (!this.isBuilt) {
      InternalError.throw('DocumentMetadata is not initialized');
    }
  }

  /**
   * Builds the configured documents.
   */
  protected async buildDocuments(): Promise<void> {
    await Promise.all(
      this.documents.map((DocumentClass) => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            this.loadedDocumentMetadata.set(
              DocumentClass,
              await this.buildMetadataForDocument(DocumentClass)
            );
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      })
    );
  }

  /**
   * Builds the DocumentMetadata and it's fields for the given class.
   */
  protected async buildMetadataForDocument<T = any>(
    DocumentClass: Constructor<T>
  ): Promise<DocumentMetadata<T>> {
    if (!definitionStorage.documents.has(DocumentClass)) {
      InternalError.throw(
        `"${DocumentClass.name}" is not a decorated @Document()`
      );
    }

    const def = definitionStorage.documents.get(DocumentClass);
    const client = this.manager.client;
    const db = client.db(def.database);

    const RepositoryClass = def.repository ? def.repository() : Repository;
    const repository = await Promise.resolve(
      this.manager.container.get(RepositoryClass)
    );

    return new DocumentMetadata({
      DocumentClass,
      manager: this.manager,
      fields: this.buildFields(DocumentClass),
      client,
      db,
      collection: db.collection(def.collection),
      repository,
      extensions: def.extensions || {}
    });
  }

  protected buildEmbeddedDocumentMetadata(
    DocumentClass: Constructor
  ): EmbeddedDocumentMetadata {
    if (this.loadedEmbeddedDocumentMetadata.has(DocumentClass)) {
      return this.loadedEmbeddedDocumentMetadata.get(DocumentClass);
    }

    const embeddedMetadata = new EmbeddedDocumentMetadata(
      this.manager,
      DocumentClass,
      this.buildFields(DocumentClass),
      this.locateParentDefinition(DocumentClass),
      this.buildDiscriminatorMetadata(DocumentClass)
    );

    this.loadedEmbeddedDocumentMetadata.set(DocumentClass, embeddedMetadata);

    return embeddedMetadata;
  }

  /**
   * Recursively adds fields to the DocumentMetadata.
   */
  protected buildFields(
    target: Constructor,
    fields?: FieldsMetadata
  ): FieldsMetadata {
    fields = fields || new Map();

    if (definitionStorage.fields.has(target)) {
      definitionStorage.fields.get(target).forEach((prop) => {
        if (!prop.isEmbedded) {
          fields.set(
            prop.propertyName,
            new FieldMetadata({
              ...prop,
              isEmbeddedArray: false
            })
          );
        } else {
          let embeddedType = prop.embedded();
          const isEmbeddedArray = Array.isArray(embeddedType);
          if (isEmbeddedArray) {
            embeddedType = embeddedType[0];
          }

          const embeddedMetadata = this.buildEmbeddedDocumentMetadata(
            embeddedType
          );

          fields.set(
            prop.propertyName,
            new FieldMetadata({
              ...prop,
              isEmbeddedArray,
              embeddedMetadata,
              embeddedType
            })
          );
        }
      });
    }

    // locate inherited decorated fields
    let proto = Object.getPrototypeOf(target);
    while (proto && proto.prototype) {
      if (definitionStorage.fields.has(proto)) {
        this.buildFields(proto, fields);
      }

      proto = Object.getPrototypeOf(proto);
    }

    if (!fields.size) {
      // make the error more clear for discriminator mapped classes
      if (definitionStorage.discriminators.has(target)) {
        DiscriminatorMetadata.assertValid(
          definitionStorage.discriminators.get(target)
        );
      }

      InternalError.throw(`"${target.name}" does not have any fields`);
    }

    return fields;
  }

  private locateParentDefinition(
    target: Constructor
  ): ParentDefinition | undefined {
    if (definitionStorage.parents.get(target)) {
      return definitionStorage.parents.get(target);
    }

    // locate inherited `Parent()`
    let proto = Object.getPrototypeOf(target);
    while (proto && proto.prototype) {
      if (definitionStorage.parents.get(proto)) {
        return definitionStorage.parents.get(proto);
      }

      proto = Object.getPrototypeOf(proto);
    }
  }

  private buildDiscriminatorMetadata(
    target: Constructor
  ): DiscriminatorMetadata | undefined {
    if (!definitionStorage.discriminators.has(target)) {
      return;
    }

    if (this.loadedDiscriminatorMetadata.has(target)) {
      return this.loadedDiscriminatorMetadata.get(target);
    }

    const def = definitionStorage.discriminators.get(target);
    const map = new Map<string, AbstractDocumentMetadata<any>>();
    const metadata = new DiscriminatorMetadata(def, map);

    this.loadedDiscriminatorMetadata.set(target, metadata);

    Object.keys(def.map).forEach((type) => {
      map.set(type, this.buildEmbeddedDocumentMetadata(def.map[type]()));
    });

    return metadata;
  }
}
