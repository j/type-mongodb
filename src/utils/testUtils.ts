import { DocumentManager } from '../DocumentManager';

export async function removeDocuments(dm: DocumentManager): Promise<void> {
  await dm.connect();

  await Promise.all(
    dm
      .filterMetadata(meta => !!meta.collection)
      .map(meta => meta.collection.deleteMany({}))
  );
}
