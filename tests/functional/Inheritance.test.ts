import 'reflect-metadata';
// import { ObjectId } from 'mongodb';
import { Inheritance } from '../__fixtures__/Inheritance';
import { DocumentManager } from '../../src/DocumentManager';

describe('Inheritance', () => {
  let manager: DocumentManager;

  beforeAll(async () => {
    manager = await DocumentManager.create({
      uri: 'mongodb://localhost:27017/test',
      documents: [Inheritance]
    });
  });

  afterAll(async () => {
    await manager.close();
  });

  test('works', () => {
    const meta = manager.getMetadataFor(Inheritance);

    expect(meta.fields.get('_id')).toBeDefined();
    expect(meta.fields.get('base')).toBeDefined();
    expect(
      meta.fields.get('sibling')?.embeddedMetadata?.fields.get('base')
    ).toBeDefined();
    expect(
      meta.fields.get('sibling')?.embeddedMetadata?.fields.get('baseBase')
    ).toBeDefined();
  });
});
