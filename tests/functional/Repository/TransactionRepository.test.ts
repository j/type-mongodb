import 'reflect-metadata';
import { Simple } from '../../__fixtures__/Simple';
import { User, createUserDocs } from '../../__fixtures__/User';
import { DocumentManager } from '../../../src/DocumentManager';
import { UserRepository } from '../../__fixtures__/UserRepository';
import { Session } from '../../../src/transaction/Session';
import { TransactionRepository } from '../../../src/repository/TransactionRepository';

const docs: { john?: any; mary?: any } = createUserDocs();

// checks if TransactionRepository method calls parent repository method with
// proper session
async function assertTransactionMethod(
  manager: DocumentManager,
  method: string,
  ...args: any[]
) {
  const session = manager.startSession();

  const spy = jest.spyOn(manager.getRepository(User), method as any);

  await session.withTransaction(async () => {
    const repository = session.getRepository(User);

    const result = await repository[method](...args);

    const expected = [...args];

    expected[expected.length - 1] = {
      ...expected[expected.length - 1],
      session
    };

    expect(spy.mock.calls).toHaveLength(1);
    expect(result).toBe(await spy.mock.results[0].value);
    expect(spy.mock.calls[0][0]).toEqual(expected[0]);
    expect(spy.mock.calls[0][spy.mock.calls[0].length - 1]).toHaveProperty(
      'session'
    );
    // @ts-ignore
    expect(
      (spy.mock.calls[0][spy.mock.calls[0].length - 1] as any).session
    ).toEqual(session.session);
  });

  spy.mockClear();
}

describe('TransactionRepository -> queries, inserts, & updates', () => {
  let manager: DocumentManager;

  beforeAll(async () => {
    manager = await DocumentManager.create({
      connection: {
        uri:
          'mongodb://localhost:31000,localhost:31001,localhost:31002/?replicaSet=test',
        database: 'test'
      },
      documents: [Simple, User]
    });
  });

  beforeEach(async () => {
    await manager.collection(User).insertMany(Object.values(docs));
  });

  afterAll(async () => {
    await manager.close();
  });

  afterEach(async () => {
    await manager.collection(User).deleteMany({});
  });

  test('gets transaction repository', async () => {
    const session = manager.startSession();

    expect(session).toBeInstanceOf(Session);

    await session.withTransaction(async () => {
      expect(session.getRepository(User)).toBeInstanceOf(TransactionRepository);
      // @ts-ignore
      expect(session.getRepository(User).repository).toBeInstanceOf(
        UserRepository
      );
    });
  });

  const update = { $set: { name: 'John' } };

  [
    ['find', {}, { opt: true }],
    ['findByIds', [docs.john._id], { opt: true }],
    ['findById', docs.john._id, { opt: true }],
    ['findByIdOrFail', docs.john._id, { opt: true }],
    ['findOne', {}, { opt: true }],
    ['findOneOrFail', {}, { opt: true }],
    ['create', {}, { opt: true }],
    ['createOne', {}, { opt: true }],
    ['createMany', [{}], { opt: true }],
    ['insertOne', new User(), { opt: true }],
    ['insertMany', [new User()], { opt: true }],
    ['findOneAndUpdate', { _id: docs.john._id }, update, { opt: true }],
    ['findByIdAndUpdate', docs.john._id, update, { opt: true }],
    ['findOneAndReplace', { _id: docs.john._id }, {}, { opt: true }],
    ['findByIdAndReplace', docs.john._id, {}, { opt: true }],
    ['findOneAndDelete', { _id: docs.john._id }, {}, { opt: true }],
    ['findByIdAndDelete', docs.john._id, {}, { opt: true }],
    ['updateOne', { _id: docs.john._id }, update, { opt: true }],
    ['updateById', docs.john._id, update, { opt: true }],
    ['updateMany', { _id: docs.john._id }, update, { opt: true }],
    ['updateByIds', [docs.john._id], update, { opt: true }],
    [
      'replaceOne',
      { _id: docs.john._id },
      { _id: docs.john._id },
      { opt: true }
    ],
    ['replaceById', docs.john._id, { _id: docs.john._id }, { opt: true }],
    ['deleteOne', { _id: docs.john._id }, { opt: true }],
    ['deleteById', docs.john._id, { opt: true }],
    ['deleteMany', {}, { opt: true }],
    ['deleteByIds', [docs.john._id], { opt: true }]
  ].forEach(t => {
    const [method, ...args] = t;

    test(`TransactionRepository.prototype.${method} proxies calls to Repository`, async () => {
      await assertTransactionMethod(manager, method as string, ...args);
    });
  });
});
