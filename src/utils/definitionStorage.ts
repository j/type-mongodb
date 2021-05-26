import { Constructor } from '../typings';
import {
  DocumentDefinition,
  FieldDefinition,
  ParentDefinition,
  DiscriminatorDefinition
} from '../metadata';

type FieldName = string;

type DocumentStorage = Map<Constructor, DocumentDefinition>;
type FieldStorage = Map<Constructor, Map<FieldName, FieldDefinition>>;
type ParentStorage = Map<Constructor, ParentDefinition>;
type DiscriminatorStorage = Map<Constructor, DiscriminatorDefinition>;

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
