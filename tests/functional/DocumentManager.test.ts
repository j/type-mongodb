import 'reflect-metadata';
import { ObjectId, Binary } from 'mongodb';
import * as uuid from 'uuid';
import { from } from 'uuid-mongodb';
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
  @Id()
  _id: ObjectId;

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
        uri: 'mongodb://localhost:31000',
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

  describe('field renaming', () => {
    it('init', () => {
      const model = manager.init(DocumentWithRenamedFields, { isActive: true });
      expect(model.isActive).toBeTruthy();
    });
    it('merge', () => {
      const first = Object.assign(new DocumentWithRenamedFields(), {
        isActive: false
      });
      const model = manager.merge(DocumentWithRenamedFields, first, {
        isActive: true
      });
      expect(model.isActive).toBeTruthy();
    });
    it('fromDB', () => {
      const model = manager.fromDB(DocumentWithRenamedFields, { active: true });
      expect(model.isActive).toBeTruthy();
    });
    it('toDb', () => {
      const doc = manager.toDB(
        DocumentWithRenamedFields,
        Object.assign(new DocumentWithRenamedFields(), { isActive: true })
      );
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
      const _id = '393967e0-8de1-11e8-9eb6-529269fb1459';
      const field = '393967e0-8de1-11e8-9eb6-529269fb1460';

      const model = manager.fromDB(DocumentWithCustomTypes, {
        _id: from(_id),
        field: from(field)
      });
      expect(uuid.validate(model._id)).toBeTruthy();
      expect(uuid.validate(model.field)).toBeTruthy();
      expect(model._id).toEqual(_id);
      expect(model.field).toEqual(field);
      expect(typeof model.optional === 'undefined').toBe(true);
    });
    it('fromDB (with missing "createable" type)', () => {
      const _id = '393967e0-8de1-11e8-9eb6-529269fb1459';

      const model = manager.fromDB(DocumentWithCustomTypes, {
        _id: from(_id)
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
