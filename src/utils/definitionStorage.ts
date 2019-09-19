import { Newable } from '../common';
import { DocumentDefinition, FieldDefinition } from '../metadata/definitions';

type FieldName = string;

type DocumentStorage = Map<Newable<any>, DocumentDefinition>;
type FieldStorage = Map<Newable<any>, Map<FieldName, FieldDefinition>>;

export const definitionStorage: {
  documents: DocumentStorage;
  fields: FieldStorage;
} = (global as any).__TYPE_MONGODB_STORAGE__ || {
  documents: new Map(),
  fields: new Map()
};
