import 'reflect-metadata';
import { ObjectId } from 'mongodb';
import { Simple } from '../__fixtures__/Simple';
import {
  User,
  Address,
  Review,
  Product,
  createUsers
} from '../__fixtures__/User';
import { DocumentManager } from '../../src/DocumentManager';
import { DocumentMetadata } from '../../src/metadata/DocumentMetadata';
import { DocumentMetadataFactory } from '../../src/metadata/DocumentMetadataFactory';
import { Connection } from '../../src/connection/Connection';

describe('DocumentManager', () => {
  let manager: DocumentManager;

  beforeAll(async () => {
    manager = await DocumentManager.create({
      connection: {
        uri: 'mongodb://localhost:31000',
        database: 'test'
      },
      documents: [Simple, User]
    });
  });

  afterAll(async () => {
    await manager.close();
  });

  test('throws error when DocumentManager is created without a connection', async () => {
    expect(
      // @ts-ignore
      DocumentManager.create({
        documents: [Simple, User]
      })
    ).rejects.toThrow('DocumentManager needs a connection.');
  });

  test('creates DocumentManager', () => {
    expect(manager).toBeInstanceOf(DocumentManager);
    expect(manager.connection).toBeInstanceOf(Connection);
    expect(manager.metadataFactory).toBeInstanceOf(DocumentMetadataFactory);
    expect(manager.metadataFactory.loadedMetadata.size).toBe(2);
  });

  test('gets db', () => {
    expect(manager.db(User).databaseName).toEqual('test');
  });

  test('gets collection', () => {
    expect(manager.collection(User).collectionName).toEqual('User');
  });

  test('filters metadata', () => {
    expect(
      manager.filterMetadata(value => value.fields.has('reviews'))
    ).toStrictEqual([manager.getMetadataFor(User)]);
  });

  describe('document metadata', () => {
    let simple: DocumentMetadata<Simple>;
    let user: DocumentMetadata<User>;

    beforeAll(() => {
      simple = manager.getMetadataFor(Simple);
      user = manager.getMetadataFor(User);
    });

    test('creates DocumentMetadata', () => {
      expect(simple).toBeInstanceOf(DocumentMetadata);
      expect(user).toBeInstanceOf(DocumentMetadata);
    });

    test('sets db & collection', () => {
      expect(simple.db.databaseName).toEqual('test');
      expect(user.db.databaseName).toEqual('test');
      expect(simple.collection.collectionName).toEqual('Simple');
      expect(user.collection.collectionName).toEqual('User');
    });
  });

  describe('toDB', () => {
    test('converts to Simple document', () => {
      const fields = {
        _id: new ObjectId(),
        string: 'foo',
        date: new Date('1986-12-05'),
        boolean: false
      };
      expect(manager.toDB(Simple, Object.assign(new Simple(), fields))).toEqual(
        fields
      );
    });

    test('converts to User document', () => {
      const user = createUsers().john;
      const result = manager.toDB(User, user);
      expect(result.address instanceof Address).toBeFalsy();
      expect(result.reviews).toHaveLength(2);
      expect(result).toEqual({
        _id: user._id,
        name: 'John',
        address: {
          city: 'San Diego',
          state: 'CA'
        },
        reviews: [
          { product: { sku: '1', title: 'Poster' }, rating: 10 },
          { product: { sku: '2', title: 'Frame' }, rating: 5 }
        ],
        isActive: true,
        createdAt: user.createdAt
      });
    });
  });

  describe('fromDB', () => {
    test('hydrates document into Simple', () => {
      const fields = {
        _id: new ObjectId(),
        string: 'foo',
        date: new Date('1986-12-05'),
        boolean: false
      };
      const simple = manager.fromDB(Simple, fields);
      expect(simple).toBeInstanceOf(Simple);
      expect(simple).toEqual(Object.assign(new Simple(), fields));
    });

    test('hydrates document into User', () => {
      const user = createUsers().john;
      const result = manager.fromDB(User, {
        _id: user._id,
        name: 'John',
        address: {
          city: 'San Diego',
          state: 'CA'
        },
        reviews: [
          { product: { sku: '1', title: 'Poster' }, rating: 10 },
          { product: { sku: '2', title: 'Frame' }, rating: 5 }
        ],
        isActive: true,
        createdAt: user.createdAt
      });
      expect(result).toBeInstanceOf(User);
      expect(result.address).toBeInstanceOf(Address);
      expect(result.reviews).toHaveLength(2);
      expect(result.reviews[0]).toBeInstanceOf(Review);
      expect(result.reviews[0].product).toBeInstanceOf(Product);
      expect(result.reviews[1]).toBeInstanceOf(Review);
      expect(result.reviews[1].product).toBeInstanceOf(Product);
      expect(result).toEqual(user);
    });
  });

  describe('init', () => {
    test('creates an object of Simple', () => {
      const fields = {
        _id: new ObjectId(),
        string: 'foo',
        date: new Date('1986-12-05'),
        boolean: false
      };
      const simple = manager.init(Simple, fields);
      expect(simple).toBeInstanceOf(Simple);
      expect(simple).toEqual(Object.assign(new Simple(), fields));
    });

    test('creates an object of User', () => {
      const user = createUsers().john;
      const result = manager.init(User, {
        _id: user._id,
        name: 'John',
        address: {
          city: 'San Diego',
          state: 'CA'
        },
        reviews: [
          { product: { sku: '1', title: 'Poster' }, rating: 10 },
          { product: { sku: '2', title: 'Frame' }, rating: 5 }
        ],
        isActive: true,
        createdAt: user.createdAt
      });
      expect(result).toBeInstanceOf(User);
      expect(result.address).toBeInstanceOf(Address);
      expect(result.reviews).toHaveLength(2);
      expect(result.reviews[0]).toBeInstanceOf(Review);
      expect(result.reviews[0].product).toBeInstanceOf(Product);
      expect(result.reviews[1]).toBeInstanceOf(Review);
      expect(result.reviews[1].product).toBeInstanceOf(Product);
      expect(result).toEqual(user);
    });
  });
});
