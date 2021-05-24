import 'reflect-metadata';
import { ObjectId, Binary, ClientSession } from 'mongodb';
import * as uuid from 'uuid';
import { UUID } from 'bson';
import { Simple } from '../__fixtures__/Simple';
import {
  User,
  Address,
  Review,
  Product,
  createUsers
} from '../__fixtures__/User';
import { DocumentManager } from '../../src/DocumentManager';
import { Document, Id, Field } from '../../src/decorators';
import { DocumentMetadata } from '../../src/metadata/DocumentMetadata';
import { DocumentMetadataFactory } from '../../src/metadata/DocumentMetadataFactory';
import { Connection } from '../../src/connection/Connection';
import { UUIDType } from '../../src/types/UUIDType';
import { ValidationError } from '../../src/errors';

@Document()
class DocumentWithRenamedFields {
  @Id({ name: '_id' })
  id: ObjectId;

  @Field({ name: 'active' })
  isActive: boolean;
}

@Document()
class DocumentWithCustomTypes {
  @Id({ type: UUIDType })
  _id: string;

  @Id({ type: UUIDType })
  field: string;

  @Id({ type: UUIDType, create: false })
  optional?: string;
}

describe('DocumentManager', () => {
  let manager: DocumentManager;

  beforeAll(async () => {
    manager = await DocumentManager.create({
      connection: {
        uri: 'mongodb://localhost:27017',
        database: 'test'
      },
      documents: [
        Simple,
        User,
        DocumentWithRenamedFields,
        DocumentWithCustomTypes
      ]
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
    expect(manager.metadataFactory.loadedDocumentMetadata.size).toBe(4);
  });

  test('gets db', () => {
    expect(manager.db(User).databaseName).toEqual('test');
  });

  test('gets collection', () => {
    expect(manager.collection(User).collectionName).toEqual('User');
  });

  test('filters metadata', () => {
    expect(
      manager.filterMetadata((value) => value.fields.has('reviews'))
    ).toEqual([manager.getMetadataFor(User)]);
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
      user.topReviews = [];
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
        topReviews: [],
        isActive: true,
        createdAt: user.createdAt
      });
    });

    test('converts embedded document', () => {
      const address = createUsers().john.address;
      const result = manager.toDB(Address, address);
      expect(result instanceof Address).toBeFalsy();
      expect(result).toEqual({
        city: 'San Diego',
        state: 'CA'
      });
    });

    test('ignores undefined embedded documents', () => {
      const user = manager.init(User, {
        _id: new ObjectId(),
        name: 'John'
        // before, this would be populated as an empty address object
        // address: undefined
      });
      const result = manager.toDB(User, user);
      expect(result).toEqual({
        _id: user._id,
        name: 'John'
      });

      expect(typeof user.address === 'undefined').toBe(true);
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

    test('hydrates document into Simple ignoring constructed properties', () => {
      const fields = {
        _id: new ObjectId()
      };
      const simple = manager.fromDB(Simple, fields);
      expect(simple).toBeInstanceOf(Simple);
      expect(simple._id).toBeInstanceOf(ObjectId);
      expect(typeof simple.date === 'undefined').toBe(true);
      expect(typeof simple.boolean === 'undefined').toBe(true);
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

    test('hydrates embedded document', () => {
      const fields = {
        city: 'San Diego',
        state: 'CA'
      };

      const address = manager.fromDB(Address, fields);
      expect(address).toBeInstanceOf(Address);
      expect(address).toEqual(Object.assign(new Address(), fields));
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
        _id: user._id.toHexString(),
        name: 'John',
        address: {
          city: 'San Diego',
          state: 'CA'
        },
        reviews: [
          { product: { sku: '1', title: 'Poster' }, rating: 10 },
          { product: { sku: '2', title: 'Frame' }, rating: 5 }
        ],
        topReviews: ['393967e0-8de1-11e8-9eb6-529269fb1459'],
        bestFriends: ['507f191e810c19729de860ea'],
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
      expect(result.topReviews).toEqual([
        '393967e0-8de1-11e8-9eb6-529269fb1459'
      ]);
      expect(result.bestFriends).toHaveLength(1);
      expect(result.bestFriends[0]).toBeInstanceOf(ObjectId);
      expect(result.bestFriends[0].toHexString()).toEqual(
        '507f191e810c19729de860ea'
      );
    });

    test('inits embedded document', () => {
      const fields = {
        city: 'San Diego',
        state: 'CA'
      };
      const address = manager.init(Address, fields);
      expect(address).toBeInstanceOf(Address);
      expect(address).toEqual(Object.assign(new Address(), fields));
    });
  });

  describe('withTransaction', () => {
    it('uses a transaction', async () => {
      const user = await manager.withTransaction((session: ClientSession) => {
        // @ts-ignore
        return manager
          .getRepository(User)
          .create(createUsers().john, { session });
      });

      expect(user).toBeInstanceOf(User);
    });
  });

  describe('field renaming', () => {
    it('init', () => {
      const model = manager.init(DocumentWithRenamedFields, { isActive: true });
      expect(model.id).toBeInstanceOf(ObjectId);
      expect(model.isActive).toBeTruthy();
    });
    it('merge', () => {
      const id1 = new ObjectId();
      const id2 = new ObjectId();
      const first = Object.assign(new DocumentWithRenamedFields(), {
        id: id1,
        isActive: false
      });
      const model = manager.merge(DocumentWithRenamedFields, first, {
        id: id2,
        isActive: true
      });
      expect(model.isActive).toBeTruthy();
      expect(model.id.toHexString()).toBe(id2.toHexString());
    });
    it('fromDB', () => {
      const _id = new ObjectId();
      const model = manager.fromDB(DocumentWithRenamedFields, {
        _id,
        active: true
      });
      expect(model.isActive).toBeTruthy();
      expect(model.id.toHexString()).toBe(_id.toHexString());
    });
    it('toDb', () => {
      const id = new ObjectId();
      const doc = manager.toDB(
        DocumentWithRenamedFields,
        Object.assign(new DocumentWithRenamedFields(), { id, isActive: true })
      );
      expect(doc._id.toHexString()).toBe(id.toHexString());
      expect(doc.active).toBeTruthy();
    });
  });

  describe('document with uuid', () => {
    it('init', () => {
      const model = manager.init(DocumentWithCustomTypes, {});
      expect(uuid.validate(model._id)).toBeTruthy();
      expect(uuid.validate(model.field)).toBeTruthy();
      expect(typeof model.optional === 'undefined').toBe(true);
    });
    it('merge', () => {
      const ids = [uuid.v4(), uuid.v4()];

      const first = Object.assign(new DocumentWithCustomTypes(), {
        _id: ids[0]
      });
      const model = manager.merge(DocumentWithCustomTypes, first, {
        field: ids[1]
      });
      expect(model._id).toBe(ids[0]);
      expect(model.field).toBe(ids[1]);
    });
    it('fromDB', () => {
      const _id = '290a1768-c0a2-409b-95fd-0768d96e172a';
      const field = '290a1768-c0a2-409b-95fd-0768d96e172b';

      const model = manager.fromDB(DocumentWithCustomTypes, {
        _id: new UUID(_id).toBinary(),
        field: new UUID(field).toBinary()
      });
      expect(uuid.validate(model._id)).toBeTruthy();
      expect(uuid.validate(model.field)).toBeTruthy();
      expect(model._id).toEqual(_id);
      expect(model.field).toEqual(field);
      expect(typeof model.optional === 'undefined').toBe(true);
    });
    it('fromDB (with missing "createable" type)', () => {
      const _id = '290a1768-c0a2-409b-95fd-0768d96e172a';

      const model = manager.fromDB(DocumentWithCustomTypes, {
        _id: new UUID(_id).toBinary()
      });
      expect(uuid.validate(model._id)).toBeTruthy();
      expect(model._id).toEqual(_id);
      expect(typeof model.field === 'undefined').toBe(true);
      expect(typeof model.optional === 'undefined').toBe(true);
    });
    it('toDb', () => {
      const uuid = new UUIDType();
      const model = Object.assign(new DocumentWithCustomTypes(), {});
      const doc = manager.toDB(DocumentWithCustomTypes, model);
      expect(doc._id).toBeInstanceOf(Binary);
      expect(doc.field).toBeInstanceOf(Binary);
      expect(uuid.convertToJSValue((doc.field as any) as Binary)).toBe(
        model.field
      );
      expect(typeof doc.optional === 'undefined').toBe(true);
      expect(typeof model.optional === 'undefined').toBe(true);
    });

    it('throws errors on invalid uuids', () => {
      let errors: ValidationError[] = [];

      // init
      try {
        manager.init(DocumentWithCustomTypes, { _id: 'invalid init id' });
      } catch (err) {
        errors.push(err);
      }

      // merge
      try {
        manager.merge(DocumentWithCustomTypes, new DocumentWithCustomTypes(), {
          _id: 'invalid mege id'
        });
      } catch (err) {
        errors.push(err);
      }

      // toDB
      try {
        manager.toDB(
          DocumentWithCustomTypes,
          Object.assign(new DocumentWithCustomTypes(), {
            _id: 'invalid toDB id'
          })
        );
      } catch (err) {
        errors.push(err);
      }

      // fromDB
      try {
        manager.fromDB(DocumentWithCustomTypes, { _id: 'invalid fromDB id' });
      } catch (err) {
        errors.push(err);
      }

      expect(errors).toEqual([
        new ValidationError('Invalid UUID', {
          value: 'invalid init id',
          mode: 'js'
        }),
        new ValidationError('Invalid UUID', {
          value: 'invalid merge id',
          mode: 'js'
        }),
        new ValidationError('Invalid UUID', {
          value: 'invalid toDB id',
          mode: 'js'
        }),
        new ValidationError('Invalid UUID', {
          value: 'invalid fromDB id',
          mode: 'database'
        })
      ]);
    });
  });
});
