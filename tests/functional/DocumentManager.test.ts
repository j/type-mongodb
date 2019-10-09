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
import { ConnectionManager } from '../../src/connection/ConnectionManager';
import { DocumentMetadataFactory } from '../../src/metadata/DocumentMetadataFactory';
import { Document, Field } from '../../src';

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

  test('throws error when DocumentManager is created with connection and connections', async () => {
    expect(
      DocumentManager.create({
        connection: {
          uri: 'mongodb://localhost:31000',
          database: 'test'
        },
        connections: [
          {
            uri: 'mongodb://localhost:31000',
            database: 'test'
          }
        ],
        documents: [Simple, User]
      })
    ).rejects.toThrow(
      'DocumentManager cannot have both "connection" and "connections" options.'
    );
  });

  test('throws error when DocumentManager is created without a connection', async () => {
    expect(
      DocumentManager.create({
        documents: [Simple, User]
      })
    ).rejects.toThrow('DocumentManager needs a connection.');
  });

  test('creates DocumentManager', () => {
    expect(manager).toBeInstanceOf(DocumentManager);
    expect(manager.connectionManager).toBeInstanceOf(ConnectionManager);
    expect(manager.connectionManager.connections.size).toBe(1);
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

  describe('multiple connections', () => {
    let dm: DocumentManager;

    @Document()
    class Default {
      @Field()
      _id: ObjectId;

      @Field()
      field: string;
    }

    @Document({ connection: 'two' })
    class Connection2 {
      @Field()
      _id: ObjectId;

      @Field()
      field: string;
    }

    @Document({ connection: 'two', database: 'test3' })
    class Connection2DiffDb {
      @Field()
      _id: ObjectId;

      @Field()
      field: string;
    }

    @Document({ connection: 'two', collection: 'diff_collection' })
    class Connection2DiffCollection {
      @Field()
      _id: ObjectId;

      @Field()
      field: string;
    }

    beforeAll(async () => {
      dm = await DocumentManager.create({
        connections: [
          {
            uri: 'mongodb://localhost:31000',
            database: 'test'
          },
          {
            name: 'two',
            uri: 'mongodb://localhost:31000?retryWrites=false',
            database: 'test2'
          }
        ],
        documents: [
          Default,
          Connection2,
          Connection2DiffDb,
          Connection2DiffCollection
        ]
      });
    });

    afterAll(async () => {
      await dm.close();
    });

    it('works with different variants', async () => {
      const defaultMeta = dm.getMetadataFor(Default);
      const connectionMeta = dm.getMetadataFor(Connection2);
      const connectionDiffDBMeta = dm.getMetadataFor(Connection2DiffDb);
      const connectionDiffCollectionMeta = dm.getMetadataFor(
        Connection2DiffCollection
      );

      expect(
        defaultMeta.connection.client === connectionMeta.connection.client
      ).toBeFalsy();
      expect(
        connectionMeta.connection.client ===
          connectionDiffDBMeta.connection.client
      ).toBeTruthy();
      expect(
        connectionMeta.connection.client ===
          connectionDiffCollectionMeta.connection.client
      ).toBeTruthy();
      expect(defaultMeta.connection.name).toBe('default');
      expect(defaultMeta.connection.database).toBe('test');
      expect(defaultMeta.db.databaseName).toBe('test');
      expect(defaultMeta.collection.collectionName).toBe('Default');
      expect(connectionMeta.connection.name).toBe('two');
      expect(connectionMeta.connection.database).toBe('test2');
      expect(connectionMeta.db.databaseName).toBe('test2');
      expect(connectionMeta.collection.collectionName).toBe('Connection2');
      expect(connectionDiffDBMeta.connection.name).toBe('two');
      expect(connectionDiffDBMeta.connection.database).toBe('test2');
      expect(connectionDiffDBMeta.db.databaseName).toBe('test3');
      expect(connectionDiffDBMeta.collection.collectionName).toBe(
        'Connection2DiffDb'
      );
      expect(connectionDiffCollectionMeta.connection.name).toBe('two');
      expect(connectionDiffCollectionMeta.connection.database).toBe('test2');
      expect(connectionDiffCollectionMeta.db.databaseName).toBe('test2');
      expect(connectionDiffCollectionMeta.collection.collectionName).toBe(
        'diff_collection'
      );
    });
  });
});
