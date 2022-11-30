import 'reflect-metadata';
import { ObjectId, Binary } from 'mongodb';
import { Simple } from '../../__fixtures__/Simple';
import { User } from '../../__fixtures__/User';
import { UserRepository } from '../../__fixtures__/UserRepository';
import { DocumentManager, UUIDType } from '../../../src';

type TestCollection = Array<[string, any, any, boolean?]>;

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

describe('Repository.castUpdateFilter', () => {
  let manager: DocumentManager;
  let repository: UserRepository;

  beforeAll(async () => {
    manager = await DocumentManager.create({
      uri: process.env.MONGODB_URI,
      documents: [Simple, User]
    });

    repository = manager.getRepository(User);
  });

  afterAll(async () => {
    await manager.close();
  });

  // Filter validation cases
  const $set: TestCollection = [
    ['$set', { $set: { _id: id().from } }, { $set: { _id: id().to } }],
    [
      `$set array field`,
      { $set: { 'reviews.0.productUUIDs': uuid().from } },
      { $set: { 'reviews.0.productUUIDs': uuid().to } }
    ],
    [
      `$set array`,
      { $set: { 'reviews.0': { productUUIDs: uuid().from } } },
      { $set: { 'reviews.0': { productUUIDs: uuid().to } } }
    ],
    [
      `$set using $ on array field`,
      { $set: { 'reviews.$.productUUIDs': uuid().from } },
      { $set: { 'reviews.$.productUUIDs': uuid().to } }
    ],
    [
      `$set using $ on array`,
      { $set: { 'reviews.$': { productUUIDs: uuid().from } } },
      { $set: { 'reviews.$': { productUUIDs: uuid().to } } }
    ],
    [
      `$set using $[] on array field`,
      { $set: { 'reviews.$[].productUUIDs': uuid().from } },
      { $set: { 'reviews.$[].productUUIDs': uuid().to } }
    ],
    [
      `$set using $[] on array`,
      { $set: { 'reviews.$[]': { productUUIDs: uuid().from } } },
      { $set: { 'reviews.$[]': { productUUIDs: uuid().to } } }
    ],
    [
      `$set using $[<identifier>] on array field`,
      { $set: { 'reviews.$[element].productUUIDs': uuid().from } },
      { $set: { 'reviews.$[element].productUUIDs': uuid().to } }
    ],
    [
      `$set using $[<identifier>] on array`,
      { $set: { 'reviews.$[element]': { productUUIDs: uuid().from } } },
      { $set: { 'reviews.$[element]': { productUUIDs: uuid().to } } }
    ]
  ];

  const $addToSet: TestCollection = [
    [
      '$addToSet',
      { $addToSet: { bestFriends: id().from } },
      { $addToSet: { bestFriends: id().to } }
    ],
    [
      '$addToSet with $each modifier',
      { $addToSet: { bestFriends: { $each: [id().from] } } },
      { $addToSet: { bestFriends: { $each: [id().to] } } }
    ]
  ];

  const $pop: TestCollection = [
    ['$pop', { $pop: { bestFriends: 1 } }, { $pop: { bestFriends: 1 } }]
  ];

  const $pull: TestCollection = [
    [
      '$pull',
      { $pull: { bestFriends: { $in: [id().from] } } },
      { $pull: { bestFriends: { $in: [id().to] } } }
    ],
    [
      '$pull with $gte modifier',
      { $pull: { bestFriends: { $gte: id().from } } },
      { $pull: { bestFriends: { $gte: id().to } } }
    ],
    [
      `$pull with "$elemMatch"`,
      { $pull: { reviews: { $elemMatch: { uuid: uuid().from } } } },
      { $pull: { reviews: { $elemMatch: { uid: uuid().to } } } }
    ],
    [
      `$pull with deep "$elemMatch" and field casting`,
      {
        $pull: {
          reviews: {
            $elemMatch: {
              uuid: uuid().from,
              'product.uuid': uuid().from,
              'productUUIDs.0': { $gte: uuid().from }
            }
          }
        }
      },
      {
        $pull: {
          reviews: {
            $elemMatch: {
              uid: uuid().to,
              'product.uid': uuid().to,
              'productUUIDs.0': { $gte: uuid().to }
            }
          }
        }
      }
    ]
  ];

  const $push: TestCollection = [
    [
      '$push',
      { $push: { bestFriends: id().from } },
      { $push: { bestFriends: id().to } }
    ],
    [
      '$push advanced',
      {
        $push: {
          reviews: {
            $each: [{ uuid: uuid().from }],
            $sort: { productUUIDs: -1 },
            $slice: 3,
            $position: 0
          }
        }
      },
      {
        $push: {
          reviews: {
            $each: [{ uid: uuid().to }],
            $sort: { productUUIDs: -1 },
            $slice: 3,
            $position: 0
          }
        }
      }
    ]
  ];

  const $pullAll: TestCollection = [
    [
      '$pullAll',
      { $pullAll: { bestFriends: [id().from] } },
      { $pullAll: { bestFriends: [id().to] } }
    ],
    [
      '$pullAll with field renaming',
      { $pullAll: { 'reviews.uuid': [uuid().from] } },
      { $pullAll: { 'reviews.uid': [uuid().to] } }
    ]
  ];

  const advanced: TestCollection = [
    [
      'advanced',
      {
        $set: {
          'reviews.0.uuid': uuid().from,
          'reviews.0.productUUIDs.0': uuid().from,
          'reviews.product': {
            uuid: uuid().to,
            sku: 'ABC',
            title: 'Title'
          }
        },
        $push: {
          reviews: {
            $each: [{ uuid: uuid().from }],
            $sort: { productUUIDs: -1 },
            $slice: 3,
            $position: 0
          }
        }
      },
      {
        $set: {
          'reviews.0.uid': uuid().to,
          'reviews.0.productUUIDs.0': uuid().to,
          'reviews.product': {
            uid: uuid().to,
            sku: 'ABC',
            title: 'Title'
          }
        },
        $push: {
          reviews: {
            $each: [{ uid: uuid().to }],
            $sort: { productUUIDs: -1 },
            $slice: 3,
            $position: 0
          }
        }
      }
    ]
  ];

  [
    ...$set,
    ...$addToSet,
    ...$pop,
    ...$pull,
    ...$push,
    ...$pullAll,
    ...advanced
  ].forEach(([name, query, expected]: TestCollection) => {
    test(`${name}`, () => {
      const update = repository.castUpdateFilter(query);
      expect(update).toEqual(expected);
    });
  });
});
