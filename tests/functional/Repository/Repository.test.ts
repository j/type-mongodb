import 'reflect-metadata';
import { Cursor, Collection, ObjectId } from 'mongodb';
import { Simple } from '../../__fixtures__/Simple';
import { User, createUsers, createUserDocs } from '../../__fixtures__/User';
import { DocumentManager } from '../../../src/DocumentManager';
import { DocumentMetadata } from '../../../src/metadata/DocumentMetadata';
import { UserRepository } from '../../__fixtures__/UserRepository';
import { Repository } from '../../../src';

describe('DocumentManager -> queries, inserts, & updates', () => {
  let manager: DocumentManager;
  let docs: { john?: any; mary?: any } = {};
  let fixtures: { john?: User; mary?: User } = {};
  let spies: { [key: string]: jest.SpyInstance } = {};

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

  beforeEach(async () => {
    docs = createUserDocs();
    fixtures = createUsers(docs);

    await manager.collection(User).insertMany(Object.values(docs));

    spies.fromDB = jest.spyOn(DocumentMetadata.prototype, 'fromDB');
    spies.toDB = jest.spyOn(DocumentMetadata.prototype, 'toDB');
    const props: Array<
      {
        [K in keyof Collection]: Collection[K] extends (...args: any[]) => any
          ? K
          : never;
      }[keyof Collection] &
        string
    > = [
      'find',
      'findOne',
      'findOneAndUpdate',
      'findOneAndDelete',
      'findOneAndReplace',
      'insertMany',
      'insertOne',
      'updateMany',
      'updateOne',
      'replaceOne',
      'deleteMany',
      'deleteOne'
    ];
    props.forEach(method => {
      if (spies[method]) {
        spies[method].mockClear();
      } else {
        spies[method] = jest.spyOn(
          manager.getMetadataFor(User).collection,
          method
        );
      }
    });
  });

  afterEach(async () => {
    Object.keys(spies).forEach(name => {
      spies[name].mockClear();
    });

    await manager.collection(User).drop();
  });

  test('gets default repository', async () => {
    expect(manager.getRepository(Simple)).toBeInstanceOf(Repository);
    expect(manager.getRepository(Simple)).not.toBeInstanceOf(UserRepository);
  });

  test('gets custom repository', async () => {
    expect(manager.getRepository(User)).toBeInstanceOf(Repository);
    expect(manager.getRepository(User)).toBeInstanceOf(UserRepository);
  });

  test('find() -> returns Cursor', async () => {
    expect(manager.getRepository(User).find()).toBeInstanceOf(Cursor);
  });

  test('find() -> finds documents', async () => {
    const users = await manager
      .getRepository(User)
      .find()
      .sort({ _id: 1 })
      .toArray();
    expect(users).toHaveLength(2);
    expect(users).toStrictEqual(Object.values(fixtures));
    expect(spies.fromDB).toHaveBeenCalledTimes(2);
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith(undefined, undefined);
  });

  test('find() -> with filter', async () => {
    const users = await manager
      .getRepository(User)
      .find({ name: 'John' })
      .sort({ _id: 1 })
      .toArray();
    expect(users).toHaveLength(1);
    expect(users).toStrictEqual([fixtures.john]);
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith({ name: 'John' }, undefined);
  });

  test('find() ->  with options', async () => {
    const users = await manager
      .getRepository(User)
      .find({}, { sort: { _id: 1 } })
      .toArray();
    expect(users).toHaveLength(2);
    expect(users).toStrictEqual(Object.values(fixtures));
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith({}, { sort: { _id: 1 } });
    expect(spies.fromDB).toHaveBeenCalledTimes(2);
  });

  test('findById() -> gets user', async () => {
    expect(
      await manager.getRepository(User).findById(fixtures.john._id)
    ).toStrictEqual(fixtures.john);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      undefined
    );
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
  });

  test('findByIdOrFail() -> fails when not found', async () => {
    const _id = new ObjectId();
    await expect(
      manager.getRepository(User).findByIdOrFail(_id)
    ).rejects.toThrow(`"User" with id "${_id}" not found`);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith({ _id }, undefined);
    expect(spies.fromDB).toHaveBeenCalledTimes(0);
  });

  test('findOne() -> gets a user', async () => {
    expect(
      await manager.getRepository(User).findOne({ name: 'John' })
    ).toStrictEqual(fixtures.john);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith({ name: 'John' }, undefined);
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
  });

  test('findOneOrFail() -> fails when not found', async () => {
    await expect(
      manager.getRepository(User).findOneOrFail({ name: 'Nope' })
    ).rejects.toThrow(`"User" not found with criteria: '{"name":"Nope"}'`);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith({ name: 'Nope' }, undefined);
    expect(spies.fromDB).toHaveBeenCalledTimes(0);
  });

  test('findOneOrFail() -> does not fail when found', async () => {
    expect(
      await manager
        .getRepository(User)
        .findOneOrFail({ _id: fixtures.john._id })
    ).toStrictEqual(fixtures.john);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      undefined
    );
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
  });

  test('create() -> creates many (with ids)', async () => {
    await manager.collection(User).deleteMany({});
    expect(
      await manager.getRepository(User).create(Object.values(docs))
    ).toStrictEqual(Object.values(fixtures));
    expect(spies.insertMany).toHaveBeenCalledTimes(1);
    expect(spies.insertMany).toHaveBeenCalledWith(
      Object.values(docs),
      undefined
    );
  });

  test('create() -> creates many (without ids)', async () => {
    const result = await manager.getRepository(User).create([{ name: 'Jim' }]);
    expect(result).toHaveLength(1);
    expect(ObjectId.isValid(result[0]._id)).toBeTruthy();
    const doc = { _id: result[0]._id, name: 'Jim' };
    expect(result).toStrictEqual([Object.assign(new User(), doc)]);
    expect(spies.insertMany).toHaveBeenCalledTimes(1);
    expect(spies.insertMany).toHaveBeenCalledWith([doc], undefined);
  });

  test('create() -> creates many (with opts)', async () => {
    await manager.collection(User).deleteMany({});
    expect(
      await manager.getRepository(User).create(Object.values(docs), { w: 1 })
    ).toStrictEqual(Object.values(fixtures));
    expect(spies.insertMany).toHaveBeenCalledTimes(1);
    expect(spies.insertMany).toHaveBeenCalledWith(Object.values(docs), {
      w: 1
    });
  });

  test('create() -> creates a single model (with id)', async () => {
    const props = { _id: new ObjectId(), name: 'Jim' };
    const result = await manager.getRepository(User).create(props);
    expect(ObjectId.isValid(result._id)).toBeTruthy();
    expect(props._id).toStrictEqual(props._id);
    expect(result).toStrictEqual(Object.assign(new User(), props));
    expect(spies.insertOne).toHaveBeenCalledTimes(1);
    expect(spies.insertOne).toHaveBeenCalledWith(props, undefined);
  });

  test('create() -> creates a single model (without id)', async () => {
    const result = await manager.getRepository(User).create({ name: 'Jim' });
    expect(ObjectId.isValid(result._id)).toBeTruthy();
    const doc = { _id: result._id, name: 'Jim' };
    expect(result).toStrictEqual(Object.assign(new User(), doc));
    expect(spies.insertOne).toHaveBeenCalledTimes(1);
    expect(spies.insertOne).toHaveBeenCalledWith(doc, undefined);
  });

  test('create() -> creates a single model (with opts)', async () => {
    const props = { _id: new ObjectId(), name: 'Jim' };
    const result = await manager.getRepository(User).create(props, { w: 1 });
    expect(ObjectId.isValid(result._id)).toBeTruthy();
    expect(props._id).toStrictEqual(props._id);
    expect(result).toStrictEqual(Object.assign(new User(), props));
    expect(spies.insertOne).toHaveBeenCalledTimes(1);
    expect(spies.insertOne).toHaveBeenCalledWith(props, { w: 1 });
  });

  test('findOneAndDelete() -> without opts', async () => {
    const john = await manager.getRepository(User).findOneAndDelete({
      _id: fixtures.john._id
    });
    expect(john).toStrictEqual(fixtures.john);
    expect(spies.findOneAndDelete).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndDelete).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      undefined
    );
  });

  test('findOneAndDelete() -> with opts', async () => {
    const john = await manager
      .getRepository(User)
      .findOneAndDelete({ _id: fixtures.john._id }, { maxTimeMS: 5000 });
    expect(john).toStrictEqual(fixtures.john);
    expect(spies.findOneAndDelete).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndDelete).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { maxTimeMS: 5000 }
    );
  });

  test('findOneAndUpdate() -> without opts', async () => {
    const john = await manager
      .getRepository(User)
      .findOneAndUpdate(
        { _id: fixtures.john._id },
        { $set: { name: 'Johnny' } }
      );
    expect(john).toStrictEqual(
      Object.assign(new User(), { ...fixtures.john, name: 'Johnny' })
    );
    expect(spies.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      { returnOriginal: false }
    );
  });

  test('findOneAndUpdate() -> with opts', async () => {
    const john = await manager
      .getRepository(User)
      .findOneAndUpdate(
        { _id: fixtures.john._id },
        { $set: { name: 'Johnny' } },
        { returnOriginal: true }
      );
    expect(john).toStrictEqual(Object.assign(fixtures.john));
    expect(spies.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      { returnOriginal: true }
    );
  });

  test('findOneAndReplace() -> without opts', async () => {
    const replacement = {
      ...docs.mary,
      _id: docs.john._id
    };
    const result = await manager
      .getRepository(User)
      .findOneAndReplace({ _id: fixtures.john._id }, replacement);
    expect(result).toStrictEqual(
      Object.assign(new User(), { ...fixtures.mary, _id: fixtures.john._id })
    );
    expect(spies.findOneAndReplace).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndReplace).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { ...docs.mary, _id: fixtures.john._id },
      { returnOriginal: false }
    );
  });

  test('findOneAndReplace() -> with opts', async () => {
    const replacement = {
      ...docs.mary,
      _id: docs.john._id
    };
    const result = await manager
      .getRepository(User)
      .findOneAndReplace({ _id: fixtures.john._id }, replacement, {
        returnOriginal: true
      });
    expect(result).toStrictEqual(fixtures.john);
    expect(spies.findOneAndReplace).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndReplace).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { ...docs.mary, _id: fixtures.john._id },
      { returnOriginal: true }
    );
  });

  test('updateMany() -> without opts', async () => {
    const result = await manager
      .getRepository(User)
      .updateMany(
        { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
        { $set: { name: 'New Name' } }
      );
    expect(result.modifiedCount).toBe(2);
    expect(spies.updateMany).toHaveBeenCalledTimes(1);
    expect(spies.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      { $set: { name: 'New Name' } },
      undefined
    );
    expect(spies.updateMany.mock.results[0].value).resolves.toBe(result);
  });

  test('updateMany() -> with opts', async () => {
    const result = await manager
      .getRepository(User)
      .updateMany(
        { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
        { $set: { name: 'New Name' } },
        { w: 1 }
      );
    expect(result.modifiedCount).toBe(2);
    expect(spies.updateMany).toHaveBeenCalledTimes(1);
    expect(spies.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      { $set: { name: 'New Name' } },
      { w: 1 }
    );
    expect(spies.updateMany.mock.results[0].value).resolves.toBe(result);
  });

  test('updateOne() -> without opts', async () => {
    const result = await manager
      .getRepository(User)
      .updateOne({ _id: fixtures.john._id }, { $set: { name: 'Johnny' } });
    expect(spies.updateOne).toHaveBeenCalledTimes(1);
    expect(spies.updateOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      undefined
    );
    expect(spies.updateOne.mock.results[0].value).resolves.toBe(result);
  });

  test('updateOne() -> with opts', async () => {
    const result = await manager
      .getRepository(User)
      .updateOne(
        { _id: fixtures.john._id },
        { $set: { name: 'Johnny' } },
        { w: 1 }
      );
    expect(spies.updateOne).toHaveBeenCalledTimes(1);
    expect(spies.updateOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      { w: 1 }
    );
    expect(spies.updateOne.mock.results[0].value).resolves.toBe(result);
  });

  test('replaceOne() -> without opts', async () => {
    const replacement = { ...docs.mary, _id: docs.john._id };
    const result = await manager
      .getRepository(User)
      .replaceOne({ _id: fixtures.john._id }, replacement);
    expect(spies.replaceOne).toHaveBeenCalledTimes(1);
    expect(spies.replaceOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      replacement,
      undefined
    );
    expect(spies.replaceOne.mock.results[0].value).resolves.toBe(result);
  });

  test('replaceOne() -> with opts', async () => {
    const replacement = Object.assign({}, { ...docs.mary, _id: docs.john._id });
    const result = await manager
      .getRepository(User)
      .replaceOne({ _id: fixtures.john._id }, replacement, { w: 1 });
    expect(spies.replaceOne).toHaveBeenCalledTimes(1);
    expect(spies.replaceOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      replacement,
      { w: 1 }
    );
    expect(spies.replaceOne.mock.results[0].value).resolves.toBe(result);
  });

  test('deleteOne() -> without opts', async () => {
    const result = await manager
      .getRepository(User)
      .deleteOne({ _id: fixtures.john._id });
    expect(result).toBeTruthy();
    expect(spies.deleteOne).toHaveBeenCalledTimes(1);
    expect(spies.deleteOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      undefined
    );
  });

  test('deleteOne() -> with opts', async () => {
    const result = await manager
      .getRepository(User)
      .deleteOne({ _id: fixtures.john._id }, { w: 1 });
    expect(result).toBeTruthy();
    expect(spies.deleteOne).toHaveBeenCalledTimes(1);
    expect(spies.deleteOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { w: 1 }
    );
  });

  test('deleteMany() -> without opts', async () => {
    const result = await manager.getRepository(User).deleteMany({
      _id: { $in: [fixtures.john._id, fixtures.mary._id] }
    });
    expect(result.deletedCount).toBe(2);
    expect(spies.deleteMany).toHaveBeenCalledTimes(1);
    expect(spies.deleteMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      undefined
    );
    expect(spies.deleteMany.mock.results[0].value).resolves.toBe(result);
  });

  test('deleteMany() -> with opts', async () => {
    const result = await manager
      .getRepository(User)
      .deleteMany(
        { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
        { w: 1 }
      );
    expect(result.deletedCount).toBe(2);
    expect(spies.deleteMany).toHaveBeenCalledTimes(1);
    expect(spies.deleteMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      { w: 1 }
    );
    expect(spies.deleteMany.mock.results[0].value).resolves.toBe(result);
  });

  test('findActiveUsers() -> uses custom repository', async () => {
    const findActiveUsersSpy = jest.spyOn(
      UserRepository.prototype,
      'findActiveUsers'
    );
    const repo = manager.getRepository<UserRepository>(User);
    expect(repo).toBeInstanceOf(UserRepository);
    const users = await repo.findActiveUsers();
    expect(users).toHaveLength(1);
    expect(users).toStrictEqual([fixtures.john]);
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith({ isActive: true }, undefined);
    expect(findActiveUsersSpy).toHaveBeenCalledTimes(1);
    expect(findActiveUsersSpy).toHaveBeenCalledWith();
  });
});
