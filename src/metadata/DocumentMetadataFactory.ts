import { DocumentMetadata } from './DocumentMetadata';
import { FieldMetadata } from './FieldMetadata';
import { DocumentClass } from '../types';
import { definitionStorage } from '../utils/definitionStorage';
import { DocumentManager } from '../DocumentManager';
import { EmbeddedDocumentMetadata } from './EmbeddedDocumentMetadata';
import { FieldsMetadata } from './AbstractDocumentMetadata';

export interface BuildMetadataStorageOptions {
  dm: DocumentManager;
  documents: DocumentClass<any>[];
}

/**
 * DocumentMetadataFactory builds and validates all the Document's metadata.
 */
export class DocumentMetadataFactory {
  public loadedMetadata: Map<DocumentClass, DocumentMetadata<any>> = new Map();

  private isBuilt: boolean = false;

  constructor(public readonly opts: BuildMetadataStorageOptions) {}

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  build() {
    if (this.isBuilt) {
      throw new Error('DocumentMetadata already built');
    }

    this.buildDocuments();

    this.isBuilt = true;
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getMetadataFor<T>(DocumentClass: DocumentClass<T>): DocumentMetadata<T> {
    this.assertMetadataIsBuilt();

    return this.loadedMetadata.get(DocumentClass);
  }

  /**
   * Filters metadata by given criteria.
   */
  filterMetadata(
    filter: (value: DocumentMetadata) => boolean
  ): DocumentMetadata[] {
    return Array.from(this.loadedMetadata.values()).filter(filter);
  }

  /**
   * Filters metadata by given criteria.
   */
  map<T>(
    fn: (value: DocumentMetadata, index: number, array: DocumentMetadata[]) => T
  ): T[] {
    return Array.from(this.loadedMetadata.values()).map(fn);
  }

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected assertMetadataIsBuilt() {
    if (!this.isBuilt) {
      throw new Error('DocumentMetadata is not initialized');
    }
  }

  /**
   * Builds the configured documents.
   */
  protected buildDocuments(): void {
    this.opts.documents.forEach(DocumentClass => {
      this.loadedMetadata.set(
        DocumentClass,
        this.buildMetadataForDocument(DocumentClass)
      );
    });
  }

  /**
   * Builds the DocumentMetadata and it's fields for the given class.
   */
  protected buildMetadataForDocument(
    DocumentClass: DocumentClass
  ): DocumentMetadata {
    if (!definitionStorage.documents.has(DocumentClass)) {
      throw new Error(`"${DocumentClass.name}" is not a decorated @Document()`);
    }

    const def = definitionStorage.documents.get(DocumentClass);
    const connection = this.opts.dm.connection;
    const db = connection.getDatabase(connection, def.database);

    const repository = new def.RepositoryClass();
    repository.manager = this.opts.dm;

    const meta = new DocumentMetadata({
      DocumentClass,
      fields: this.buildFields(DocumentClass),
      connection,
      db,
      collection: db.collection(def.collection),
      repository,
      extensions: def.extensions || {}
    });

    return meta;
  }

  protected buildEmbeddedDocumentMetadata(
    DocumentClass: DocumentClass
  ): EmbeddedDocumentMetadata {
    return new EmbeddedDocumentMetadata(
      DocumentClass,
      this.buildFields(DocumentClass)
    );
  }

  /**
   * Recursively adds fields to the DocumentMetadata.
   */
  protected buildFields(
    target: DocumentClass,
    fields?: FieldsMetadata
  ): FieldsMetadata {
    if (!definitionStorage.fields.has(target)) {
      throw new Error(`"${target.name}" does not have any fields`);
    }

    fields = fields || new Map();

    definitionStorage.fields.get(target).forEach(prop => {
      if (!prop.isEmbedded) {
        fields.set(
          prop.fieldName,
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

        fields.set(
          prop.fieldName,
          new FieldMetadata({
            ...prop,
            isEmbeddedArray,
            embeddedMetadata: this.buildEmbeddedDocumentMetadata(embeddedType),
            embeddedType
          })
        );
      }
    });

    const parent = Object.getPrototypeOf(target);
    if (parent && definitionStorage.documents.has(parent)) {
      this.buildFields(parent, fields);
    }

    return fields;
  }
}
