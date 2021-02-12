import 'reflect-metadata';
import { ObjectId, Binary, FilterQuery } from 'mongodb';
import { Simple } from '../../__fixtures__/Simple';
import { User } from '../../__fixtures__/User';
import { DocumentManager } from '../../../src/DocumentManager';
import { UserRepository } from '../../__fixtures__/UserRepository';
import { UUIDType } from '../../../src';

function uuidToBinary(uuid: string): Binary {
  return new UUIDType().convertToDatabaseValue(uuid);
}

const id = (): { from: string; to: ObjectId } => ({
  from: '507f191e810c19729de860ea',
  to: new ObjectId('507f191e810c19729de860ea')
});

const uuid = (): { from: string; to: Binary } => ({
  from: '393967e0-8de1-11e8-9eb6-529269fb1459',
  to: uuidToBinary('393967e0-8de1-11e8-9eb6-529269fb1459')
});

describe('Repository.castFilter', () => {
  let manager: DocumentManager;
  let repository: UserRepository;

  async function assertValidFilter(query: any): Promise<void> {
    await repository.collection.find(query).toArray();
  }

  beforeAll(async () => {
    manager = await DocumentManager.create({
      connection: {
        uri: 'mongodb://localhost:31000',
        database: 'test'
      },
      documents: [Simple, User]
    });

    repository = manager.getRepository<UserRepository>(User);
  });

  afterAll(async () => {
    await manager.close();
  });

  // Filter validation cases
  const cases = [
    ['casts _id', { _id: id().from }, { _id: id().to }],
    [
      'casts UUID with mapped field name',
      { uuid: uuid().from },
      { uid: uuid().to }
    ],
    [
      `casts array exact match`,
      { topReviews: [uuid().from, uuid().from] },
      { topReviews: [uuid().to, uuid().to] }
    ],
    [
      `casts dot notation embedded document field as array`,
      { 'reviews.uuid': [uuid().from, uuid().from] },
      { 'reviews.uid': [uuid().to, uuid().to] }
    ],
    [
      `ignores unmapped array fields`,
      { 'reviews.rating': [1, 2] },
      { 'reviews.rating': [1, 2] }
    ],
    [
      'casts ID, UUID (with mapped field name), and normal field',
      { _id: id().from, uuid: uuid().from, name: 'John' },
      { _id: id().to, uid: uuid().to, name: 'John' }
    ],
    [
      'casts embedded document fields with custom name',
      { 'address.uuid': uuid().from },
      { 'address.uid': uuid().to }
    ],
    ...['$eq', '$gt', '$gte', '$lt', '$lte', '$ne'].map((op) => [
      `works with "${op}" comparison operator`,
      { _id: { [op]: id().from } },
      { _id: { [op]: id().to } }
    ]),
    ...['$eq', '$gt', '$gte', '$lt', '$lte', '$ne'].map((op) => [
      `works with "${op}" comparison operator`,
      { _id: { [op]: [id().from] } },
      { _id: { [op]: [id().to] } }
    ]),
    ...['$eq', '$gt', '$gte', '$lt', '$lte', '$ne'].map((op) => [
      `works with "${op}" comparison operator on arrays`,
      { topReviews: { [op]: [uuid().from, uuid().to] } },
      { topReviews: { [op]: [uuid().to, uuid().to] } }
    ]),
    ...['$in', '$nin'].map((op) => [
      `works with "${op}" logical operator`,
      {
        _id: { [op]: [id().from] },
        uuid: { [op]: [uuid().from] },
        name: { [op]: ['John', 'Doe'] }
      },
      {
        _id: { [op]: [id().to] },
        uid: { [op]: [uuid().to] },
        name: { [op]: ['John', 'Doe'] }
      }
    ]),
    [
      `works with "$not" logical operator`,
      { _id: { $not: { $gt: id().from } } },
      { _id: { $not: { $gt: id().to } } }
    ],
    [
      `works with advanced "$not" logical operator with regex`,
      {
        _id: { $not: { $gt: id().from, $lt: id().from } },
        uuid: { $not: /^p.*/ }
      },
      {
        _id: { $not: { $gt: id().to, $lt: id().to } },
        uid: { $not: /^p.*/ }
      }
    ],
    [
      `casts basic "$elemMatch"`,
      { address: { $elemMatch: { uuid: uuid().from, state: 'CA' } } },
      { address: { $elemMatch: { uid: uuid().to, state: 'CA' } } }
    ],
    [
      `casts array "$elemMatch"`,
      { topReviews: { $elemMatch: { $gte: uuid().from, $lte: uuid().from } } },
      { topReviews: { $elemMatch: { $gte: uuid().to, $lte: uuid().to } } }
    ],
    [
      `casts unmapped "$elemMatch"`,
      { addr: { $elemMatch: { foo: 'bar' } } },
      { addr: { $elemMatch: { foo: 'bar' } } }
    ],
    [
      `casts simple array`,
      { topReviews: [uuid().from, uuid().to] }, // second value already converted
      { topReviews: [uuid().to, uuid().to] }
    ],
    [
      `casts array with "$all" operator`,
      { topReviews: { $all: [uuid().from, uuid().to] } }, // second value already converted
      { topReviews: { $all: [uuid().to, uuid().to] } }
    ],
    [
      `casts array using dot notation indexing`,
      { 'reviews.1.uuid': uuid().from },
      { 'reviews.1.uid': uuid().to }
    ],
    [
      `casts embedded using dot notation indexing`,
      { 'reviews.0.productUUIDs': [uuid().from] }, // second value already converted
      { 'reviews.0.productUUIDs': [uuid().to] }
    ],
    [
      `casts embedded using "$all" operator`,
      { 'reviews.productUUIDs': { $all: [uuid().from, uuid().to] } }, // second value already converted
      { 'reviews.productUUIDs': { $all: [uuid().to, uuid().to] } }
    ],
    [
      `casts embedded using "$all" operator and dot notation indexing`,
      { 'reviews.0.productUUIDs': { $all: [uuid().from, uuid().to] } }, // second value already converted
      { 'reviews.0.productUUIDs': { $all: [uuid().to, uuid().to] } }
    ],
    [
      `casts embedded using "$not"`,
      { 'reviews.productUUIDs': { $not: { $eq: uuid().from } } }, // second value already converted
      { 'reviews.productUUIDs': { $not: { $eq: uuid().to } } }
    ],
    [
      `casts embedded using "$not" operator and dot notation indexing`,
      { 'reviews.0.productUUIDs': { $not: { $eq: uuid().from } } }, // second value already converted
      { 'reviews.0.productUUIDs': { $not: { $eq: uuid().to } } }
    ]
  ] as Array<[string, FilterQuery<User>, FilterQuery<any>, boolean?]>;

  cases.forEach(([name, query, expected]) => {
    test(`${name}`, async () => {
      const filter = repository.transformQueryFilter(query);
      expect(filter).toEqual(expected);
      await assertValidFilter(filter);
    });

    ['$and', '$nor', '$or'].forEach(($op) => {
      test(`${name} wrapped in "${$op}"`, async () => {
        const filter = repository.transformQueryFilter({ [$op]: [query] });
        expect(filter).toEqual({ [$op]: [expected] });
        await assertValidFilter(filter);
      });
    });
  });
});
