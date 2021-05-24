import { DocumentManager } from '../DocumentManager';

export async function removeDocuments(manager: DocumentManager): Promise<void> {
  await manager.connect();

  await Promise.all(
    manager
      .filterMetadata((meta) => !!meta.collection)
      .map((meta) => meta.collection.deleteMany({}))
  );
}
