import { DocumentClass } from '../types';
import {
  DocumentDefinition,
  FieldDefinition,
  ParentDefinition,
  DiscriminatorDefinition
} from '../metadata/definitions';

type FieldName = string;

type DocumentStorage = Map<DocumentClass, DocumentDefinition>;
type FieldStorage = Map<DocumentClass, Map<FieldName, FieldDefinition>>;
type ParentStorage = Map<DocumentClass, ParentDefinition>;
type DiscriminatorStorage = Map<DocumentClass, DiscriminatorDefinition>;

export const definitionStorage: {
  documents: DocumentStorage;
  fields: FieldStorage;
  parents: ParentStorage;
  discriminators: DiscriminatorStorage;
} = (global as any).__TYPE_MONGODB_STORAGE__ || {
  documents: new Map(),
  fields: new Map(),
  parents: new Map(),
  discriminators: new Map()
};
