import 'reflect-metadata';
import { DocumentManager, PartialDeep } from '../../src';
import { Parent } from '../__fixtures__/Parent';
import { Sibling } from '../__fixtures__/Sibling';
import { SiblingSibling } from '../__fixtures__/SiblingSibling';

function assertValidParent(parent: PartialDeep<Parent>) {
  expect(parent.sibling).toBeInstanceOf(Sibling);
  expect(parent.sibling?.parent).toBe(parent);

  expect(parent.siblings).toHaveLength(1);
  expect(parent.siblings?.[0]?.parent).toBeInstanceOf(Parent);
  expect(parent.siblings?.[0]?.parent).toBe(parent);

  expect(parent.sibling?.sibling).toBeInstanceOf(SiblingSibling);
  expect(parent.sibling?.sibling?.parent).toBeInstanceOf(Sibling);
  expect(parent.sibling?.sibling?.parent).toBe(parent.sibling);

  expect(parent.sibling?.siblings).toHaveLength(1);
  expect(parent.sibling?.siblings?.[0]).toBeInstanceOf(SiblingSibling);
  expect(parent.sibling?.siblings?.[0]?.parent).toBeInstanceOf(Sibling);
  expect(parent.sibling?.siblings?.[0]?.parent).toBe(parent.sibling);

  // why not
  expect(parent.sibling?.parent?.sibling?.sibling).toBe(
    parent.sibling?.sibling
  );
  expect(parent.sibling?.sibling?.rootParent).toBe(parent);
}

const doc = {
  sibling: {
    name: 'John',
    sibling: { name: 'Jack' },
    siblings: [{ name: 'Nick' }]
  },
  siblings: [
    { name: 'Betty', sibling: { name: 'Jack' }, siblings: [{ name: 'Nick' }] }
  ]
};

describe('Parent', () => {
  let manager: DocumentManager;

  beforeAll(async () => {
    manager = await DocumentManager.create({
      uri: 'mongodb://localhost:27017/test',
      documents: [Parent]
    });
  });

  afterAll(async () => {
    await manager.close();
  });

  test('init', () => {
    const parent = manager.init(Parent, doc);

    assertValidParent(parent);
  });

  test('fromDB', () => {
    const parent = manager.fromDB(Parent, doc);

    assertValidParent(parent);
  });

  test('merge', () => {
    const parent = new Parent();
    manager.merge(Parent, parent, doc);

    assertValidParent(parent);
  });
});
