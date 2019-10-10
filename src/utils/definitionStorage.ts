import { DocumentClass } from '../types';
import { DocumentDefinition, FieldDefinition } from '../metadata/definitions';

type FieldName = string;

type DocumentStorage = Map<DocumentClass<any>, DocumentDefinition>;
type FieldStorage = Map<DocumentClass<any>, Map<FieldName, FieldDefinition>>;

export const definitionStorage: {
  documents: DocumentStorage;
  fields: FieldStorage;
} = (global as any).__TYPE_MONGODB_STORAGE__ || {
  documents: new Map(),
  fields: new Map()
};
