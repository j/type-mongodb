import { DocumentMetadata } from './DocumentMetadata';
import { FieldMetadata } from './FieldMetadata';
import { Newable, FieldsOf } from '../common/types';
import { definitionStorage } from '../utils/definitionStorage';
import { TypeMongoError } from '../errors';
import { DocumentManager } from '../DocumentManager';
import { EmbeddedDocumentMetadata } from './EmbeddedDocumentMetadata';
import { FieldsMetadata } from './BaseDocumentMetadata';

export interface BuildMetadataStorageOptions {
  dm: DocumentManager;
  documents: Newable<any>[];
}

/**
 * DocumentMetadataFactory builds and validates all the Document's metadata.
 */
export class DocumentMetadataFactory {
  public loadedMetadata: Map<Newable, DocumentMetadata<any, any>> = new Map();
  private isBuilt: boolean = false;

  constructor(public readonly opts: BuildMetadataStorageOptions) {}

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  build() {
    if (this.isBuilt) {
      throw new TypeMongoError('DocumentMetadata already built');
    }

    this.buildDocuments();

    this.isBuilt = true;
  }

  /**
   * Gets the DocumentMetadata for the given class.
   */
  getMetadataFor<M = any, D = FieldsOf<M>>(
    DocumentClass: Newable
  ): DocumentMetadata<M, D> {
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

  // -------------------------------------------------------------------------
  // Protected Methods
  // -------------------------------------------------------------------------

  protected assertMetadataIsBuilt() {
    if (!this.isBuilt) {
      throw new TypeMongoError('DocumentMetadata is not initialized');
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
  protected buildMetadataForDocument(DocumentClass: Newable): DocumentMetadata {
    if (!definitionStorage.documents.has(DocumentClass)) {
      throw new TypeMongoError(
        `"${DocumentClass.name}" is not a decorated @Document()`
      );
    }

    const def = definitionStorage.documents.get(DocumentClass);
    const connection = this.opts.dm.connectionManager.getConnection(
      def.connection
    );
    const db = this.opts.dm.connectionManager.getDatabase(
      connection,
      def.database
    );

    // Duck-type check if class is like the Model class for active-record style functionality
    if (typeof (def.DocumentClass as any).setDocumentManager === 'function') {
      (def.DocumentClass as any).setDocumentManager(this.opts.dm);
    }

    return new DocumentMetadata({
      DocumentClass,
      fields: this.buildFields(DocumentClass),
      connection,
      db,
      collection: db.collection(def.collection),
      extensions: def.extensions || {}
    });
  }

  protected buildEmbeddedDocumentMetadata(
    DocumentClass: Newable
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
    target: Newable,
    fields?: FieldsMetadata
  ): FieldsMetadata {
    if (!definitionStorage.fields.has(target)) {
      throw new TypeMongoError(`"${target.name}" does not have any fields`);
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
