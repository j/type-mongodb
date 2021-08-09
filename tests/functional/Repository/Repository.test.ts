import 'reflect-metadata';
import {
  FindCursor,
  Collection,
  ObjectId,
  ReturnDocument,
  Binary
} from 'mongodb';
import { Simple } from '../../__fixtures__/Simple';
import { User, createUsers, createUserDocs } from '../../__fixtures__/User';
import { DocumentManager } from '../../../src/DocumentManager';
import { DocumentMetadata } from '../../../src/metadata/DocumentMetadata';
import { UserRepository } from '../../__fixtures__/UserRepository';
import { Repository, UUIDType, removeDocuments } from '../../../src';
import { UUIDDocument } from '../../__fixtures__/UUIDDocument';

describe('Repository -> queries, inserts, & updates', () => {
  let manager: DocumentManager;
  let docs: { john?: any; mary?: any } = {};
  let fixtures: { john?: User; mary?: User } = {};
  let spies: { [key: string]: jest.SpyInstance } = {};

  beforeAll(async () => {
    manager = await DocumentManager.create({
      uri: 'mongodb://localhost:27017/test',
      documents: [Simple, User, UUIDDocument]
    });
  });

  afterAll(async () => {
    await manager.close();
  });

  beforeEach(async () => {
    await removeDocuments(manager);

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
    props.forEach((method) => {
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
    Object.keys(spies).forEach((name) => {
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
    expect(manager.getRepository(User).find()).toBeInstanceOf(FindCursor);
  });

  test('find() -> finds documents', async () => {
    const users = await manager
      .getRepository(User)
      .find()
      .sort({ _id: 1 })
      .toArray();
    expect(users).toHaveLength(2);
    expect(users).toEqual(Object.values(fixtures));
    expect(spies.fromDB).toHaveBeenCalledTimes(2);
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith({}, undefined);
  });

  test('find() -> with filter', async () => {
    const users = await manager
      .getRepository(User)
      .find({ name: 'John' })
      .sort({ _id: 1 })
      .toArray();
    expect(users).toHaveLength(1);
    expect(users).toEqual([fixtures.john]);
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
    expect(users).toEqual(Object.values(fixtures));
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith({}, { sort: { _id: 1 } });
    expect(spies.fromDB).toHaveBeenCalledTimes(2);
  });

  test('findById() -> gets user', async () => {
    expect(
      await manager.getRepository(User).findById(fixtures.john._id)
    ).toEqual(fixtures.john);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      undefined
    );
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
  });

  test('findByIds() -> gets users', async () => {
    expect(
      await manager
        .getRepository(User)
        .findByIds([fixtures.john._id, fixtures.mary._id])
        .sort({ _id: 1 })
        .toArray()
    ).toEqual([fixtures.john, fixtures.mary]);
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      undefined
    );
    expect(spies.fromDB).toHaveBeenCalledTimes(2);
  });

  test('findByIdOrFail() -> fails when not found', async () => {
    const _id = new ObjectId();
    await expect(
      manager.getRepository(User).findByIdOrFail(_id)
    ).rejects.toThrow(`"User" not found`);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith({ _id }, undefined);
    expect(spies.fromDB).toHaveBeenCalledTimes(0);
  });

  test('findOne() -> gets a user', async () => {
    expect(await manager.getRepository(User).findOne({ name: 'John' })).toEqual(
      fixtures.john
    );
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith({ name: 'John' }, undefined);
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
  });

  test('findOneOrFail() -> fails when not found', async () => {
    await expect(
      manager.getRepository(User).findOneOrFail({ name: 'Nope' })
    ).rejects.toThrow(`"User" not found`);
    expect(spies.findOne).toHaveBeenCalledTimes(1);
    expect(spies.findOne).toHaveBeenCalledWith({ name: 'Nope' }, undefined);
    expect(spies.fromDB).toHaveBeenCalledTimes(0);
  });

  test('findOneOrFail() -> does not fail when found', async () => {
    expect(
      await manager
        .getRepository(User)
        .findOneOrFail({ _id: fixtures.john._id })
    ).toEqual(fixtures.john);
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
    ).toEqual(Object.values(fixtures));
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
    const doc = { _id: result[0]._id, name: 'Jim', reviews: [] };
    expect(result).toEqual([Object.assign(new User(), doc)]);
    expect(spies.insertMany).toHaveBeenCalledTimes(1);
    expect(spies.insertMany).toHaveBeenCalledWith([doc], undefined);
  });

  test('create() -> creates many (with opts)', async () => {
    await manager.collection(User).deleteMany({});
    expect(
      await manager
        .getRepository(User)
        .create(Object.values(docs), { writeConcern: { w: 1 } })
    ).toEqual(Object.values(fixtures));
    expect(spies.insertMany).toHaveBeenCalledTimes(1);
    expect(spies.insertMany).toHaveBeenCalledWith(Object.values(docs), {
      writeConcern: { w: 1 }
    });
  });

  test('create() -> creates a single model (with id)', async () => {
    const props = { _id: new ObjectId(), name: 'Jim' };
    const result = await manager.getRepository(User).create(props);
    const expected = { ...props, reviews: [] };
    expect(ObjectId.isValid(result._id)).toBeTruthy();
    expect(props._id).toEqual(props._id);
    expect(result).toEqual(Object.assign(new User(), expected));
    expect(spies.insertOne).toHaveBeenCalledTimes(1);
    expect(spies.insertOne).toHaveBeenCalledWith(expected, undefined);
  });

  test('create() -> creates a single model (without id)', async () => {
    const result = await manager.getRepository(User).create({ name: 'Jim' });
    expect(ObjectId.isValid(result._id)).toBeTruthy();
    const expected = { _id: result._id, name: 'Jim', reviews: [] };
    expect(result).toEqual(Object.assign(new User(), expected));
    expect(spies.insertOne).toHaveBeenCalledTimes(1);
    expect(spies.insertOne).toHaveBeenCalledWith(expected, undefined);
  });

  test('create() -> creates a single model (with opts)', async () => {
    const props = { _id: new ObjectId(), name: 'Jim' };
    const result = await manager
      .getRepository(User)
      .create(props, { writeConcern: { w: 1 } });
    const expected = { ...props, reviews: [] };
    expect(ObjectId.isValid(result._id)).toBeTruthy();
    expect(props._id).toEqual(expected._id);
    expect(result).toEqual(Object.assign(new User(), expected));
    expect(spies.insertOne).toHaveBeenCalledTimes(1);
    expect(spies.insertOne).toHaveBeenCalledWith(expected, {
      writeConcern: { w: 1 }
    });
  });

  test('insertOne() - with UUID as ID', async () => {
    const model = new UUIDDocument();
    model.name = 'test';

    const inserted = await manager.getRepository(UUIDDocument).insertOne(model);

    expect(typeof model.id === 'string').toBeTruthy();
    expect(inserted.acknowledged).toBeTruthy();
  });

  test('insertMany() - with UUID as IDs', async () => {
    const model1 = new UUIDDocument();
    model1.name = 'test 1';
    const model2 = new UUIDDocument();
    model2.name = 'test 2';

    const inserted = await manager
      .getRepository(UUIDDocument)
      .insertMany([model1, model2]);

    expect(typeof model1.id === 'string').toBeTruthy();
    expect(typeof model2.id === 'string').toBeTruthy();
    expect(inserted.acknowledged).toBeTruthy();
  });

  test('insertMany() - with already set UUID as IDs', async () => {
    const model1 = new UUIDDocument();
    model1.id = '290a1768-c0a2-409b-95fd-0768d96e172a';
    model1.name = 'test 1';
    const model2 = new UUIDDocument();
    model2.id = '290a1768-c0a2-409b-95fd-0768d96e172b';
    model2.name = 'test 2';

    const repository = manager.getRepository(UUIDDocument);

    const inserted = await repository.insertMany([model1, model2]);

    expect(model1.id).toBe('290a1768-c0a2-409b-95fd-0768d96e172a');
    expect(model2.id).toBe('290a1768-c0a2-409b-95fd-0768d96e172b');
    expect(inserted.acknowledged).toBeTruthy();

    const found = await repository.collection
      .find()
      .sort({ name: 1 })
      .toArray();
    expect(found[0]._id).toBeInstanceOf(Binary);
    expect(found[1]._id).toBeInstanceOf(Binary);
    expect(new UUIDType().convertToJSValue(found[0]._id)).toEqual(
      '290a1768-c0a2-409b-95fd-0768d96e172a'
    );
    expect(new UUIDType().convertToJSValue(found[1]._id)).toEqual(
      '290a1768-c0a2-409b-95fd-0768d96e172b'
    );
  });

  test('findOneAndDelete() -> without opts', async () => {
    const john = await manager.getRepository(User).findOneAndDelete({
      _id: fixtures.john._id
    });
    expect(john).toEqual(fixtures.john);
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
    expect(john).toEqual(fixtures.john);
    expect(spies.findOneAndDelete).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndDelete).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { maxTimeMS: 5000 }
    );
  });

  test('findByIdAndDelete() -> with id', async () => {
    const john = await manager
      .getRepository(User)
      .findByIdAndDelete(fixtures.john._id, { maxTimeMS: 5000 });
    expect(john).toEqual(fixtures.john);
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
    expect(john).toEqual(fixtures.john);
    expect(spies.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      undefined
    );
  });

  test('findOneAndUpdate() -> with opts', async () => {
    const john = await manager
      .getRepository(User)
      .findOneAndUpdate(
        { _id: fixtures.john._id },
        { $set: { name: 'Johnny' } },
        { returnDocument: ReturnDocument.BEFORE }
      );
    expect(john).toEqual(fixtures.john);
    expect(spies.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      { returnDocument: ReturnDocument.BEFORE }
    );
  });

  test('findByIdAndUpdate() -> with id', async () => {
    const john = await manager
      .getRepository(User)
      .findByIdAndUpdate(
        fixtures.john._id,
        { $set: { name: 'Johnny' } },
        { returnDocument: ReturnDocument.AFTER }
      );
    expect(john).toEqual({ ...fixtures.john, name: 'Johnny' });
    expect(spies.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      { returnDocument: ReturnDocument.AFTER }
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
    expect(result).toEqual(fixtures.john);
    expect(spies.findOneAndReplace).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndReplace).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      replacement,
      undefined
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
        returnDocument: ReturnDocument.AFTER
      });
    expect(result).toEqual(replacement);
    expect(spies.findOneAndReplace).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndReplace).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { ...docs.mary, _id: fixtures.john._id },
      { returnDocument: ReturnDocument.AFTER }
    );
  });

  test('findByIdAndReplace() -> with id', async () => {
    const replacement = {
      ...docs.mary,
      _id: docs.john._id
    };
    const result = await manager
      .getRepository(User)
      .findByIdAndReplace(fixtures.john._id, replacement, {
        returnDocument: ReturnDocument.AFTER
      });
    expect(result).toEqual(replacement);
    expect(spies.findOneAndReplace).toHaveBeenCalledTimes(1);
    expect(spies.findOneAndReplace).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { ...docs.mary, _id: fixtures.john._id },
      { returnDocument: ReturnDocument.AFTER }
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
        { writeConcern: { w: 1 } }
      );
    expect(result.modifiedCount).toBe(2);
    expect(spies.updateMany).toHaveBeenCalledTimes(1);
    expect(spies.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      { $set: { name: 'New Name' } },
      { writeConcern: { w: 1 } }
    );
    expect(spies.updateMany.mock.results[0].value).resolves.toBe(result);
  });

  test('updateByIds() -> with opts', async () => {
    const result = await manager
      .getRepository(User)
      .updateByIds(
        [fixtures.john._id, fixtures.mary._id],
        { $set: { name: 'New Name' } },
        { writeConcern: { w: 1 } }
      );
    expect(result.modifiedCount).toBe(2);
    expect(spies.updateMany).toHaveBeenCalledTimes(1);
    expect(spies.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      { $set: { name: 'New Name' } },
      { writeConcern: { w: 1 } }
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
        { writeConcern: { w: 1 } }
      );
    expect(spies.updateOne).toHaveBeenCalledTimes(1);
    expect(spies.updateOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      { writeConcern: { w: 1 } }
    );
    expect(spies.updateOne.mock.results[0].value).resolves.toBe(result);
  });

  test('updateById() -> using id', async () => {
    const result = await manager
      .getRepository(User)
      .updateById(fixtures.john._id, { $set: { name: 'Johnny' } });
    expect(spies.updateOne).toHaveBeenCalledTimes(1);
    expect(spies.updateOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { $set: { name: 'Johnny' } },
      undefined
    );
    expect(spies.updateOne.mock.results[0].value).resolves.toBe(result);
  });

  test('replaceOne() -> without opts', async () => {
    const replacement = { ...docs.mary, _id: docs.john._id };
    const result = await manager
      .getRepository(User)
      .replaceOne({ _id: fixtures.john._id }, replacement);

    delete replacement._id;
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
      .replaceOne({ _id: fixtures.john._id }, replacement, {
        writeConcern: { w: 1 }
      });

    delete replacement._id;
    expect(spies.replaceOne).toHaveBeenCalledTimes(1);
    expect(spies.replaceOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      replacement,
      { writeConcern: { w: 1 } }
    );
    expect(spies.replaceOne.mock.results[0].value).resolves.toBe(result);
  });

  test('replaceOne() -> using id', async () => {
    const replacement = Object.assign({}, { ...docs.mary, _id: docs.john._id });
    const result = await manager
      .getRepository(User)
      .replaceById(fixtures.john._id, replacement, { writeConcern: { w: 1 } });

    delete replacement._id;
    expect(spies.replaceOne).toHaveBeenCalledTimes(1);
    expect(spies.replaceOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      replacement,
      { writeConcern: { w: 1 } }
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
      .deleteOne({ _id: fixtures.john._id }, { writeConcern: { w: 1 } });
    expect(result).toBeTruthy();
    expect(spies.deleteOne).toHaveBeenCalledTimes(1);
    expect(spies.deleteOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { writeConcern: { w: 1 } }
    );
  });

  test('deleteById() -> using id', async () => {
    const result = await manager
      .getRepository(User)
      .deleteById(fixtures.john._id, { writeConcern: { w: 1 } });
    expect(result).toBeTruthy();
    expect(spies.deleteOne).toHaveBeenCalledTimes(1);
    expect(spies.deleteOne).toHaveBeenCalledWith(
      { _id: fixtures.john._id },
      { writeConcern: { w: 1 } }
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
        { writeConcern: { w: 1 } }
      );
    expect(result.deletedCount).toBe(2);
    expect(spies.deleteMany).toHaveBeenCalledTimes(1);
    expect(spies.deleteMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      { writeConcern: { w: 1 } }
    );
    expect(spies.deleteMany.mock.results[0].value).resolves.toBe(result);
  });

  test('deleteByIds() -> with opts', async () => {
    const result = await manager
      .getRepository(User)
      .deleteByIds(
        [fixtures.john._id.toHexString(), fixtures.mary._id.toHexString()],
        { writeConcern: { w: 1 } }
      );
    expect(result.deletedCount).toBe(2);
    expect(spies.deleteMany).toHaveBeenCalledTimes(1);
    expect(spies.deleteMany).toHaveBeenCalledWith(
      { _id: { $in: [fixtures.john._id, fixtures.mary._id] } },
      { writeConcern: { w: 1 } }
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
    expect(users).toEqual([fixtures.john]);
    expect(spies.fromDB).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledTimes(1);
    expect(spies.find).toHaveBeenCalledWith({ isActive: true }, undefined);
    expect(findActiveUsersSpy).toHaveBeenCalledTimes(1);
    expect(findActiveUsersSpy).toHaveBeenCalledWith();
  });
});
