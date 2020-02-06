import { DocumentClass } from '../types';
import {
  DocumentDefinition,
  FieldDefinition,
  ParentDefinition
} from '../metadata/definitions';

type FieldName = string;

type DocumentStorage = Map<DocumentClass<any>, DocumentDefinition>;
type FieldStorage = Map<DocumentClass<any>, Map<FieldName, FieldDefinition>>;
type ParentStorage = Map<DocumentClass<any>, ParentDefinition>;

export const definitionStorage: {
  documents: DocumentStorage;
  fields: FieldStorage;
  parents: ParentStorage;
} = (global as any).__TYPE_MONGODB_STORAGE__ || {
  documents: new Map(),
  fields: new Map(),
  parents: new Map()
};
