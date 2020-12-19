import 'reflect-metadata';
import { ObjectId } from 'mongodb';
import { Document, Field, EventSubscriber } from '../../../src';
import { DocumentManager } from '../../../src/DocumentManager';
import { DocumentMetadata } from '../../../src/metadata/DocumentMetadata';
import { Repository } from '../../../src/repository/Repository';

@Document()
class Event {
  @Field()
  _id: ObjectId;

  @Field()
  field?: string;
}

class NoopListener implements EventSubscriber<any> {
  beforeInsert() {}
  afterInsert() {}
  beforeUpdate() {}
  afterUpdate() {}
  beforeDelete() {}
  afterDelete() {}
  beforeReplace() {}
  afterReplace() {}
  beforeUpdateMany() {}
  afterUpdateMany() {}
  beforeDeleteMany() {}
  afterDeleteMany() {}
}

describe('DocumentManager -> Events', () => {
  let manager: DocumentManager;
  let repository: Repository<Event>;
  let meta: DocumentMetadata;
  let spies: { [key: string]: jest.SpyInstance } = {};

  const assertEventsCalled = (events: jest.SpyInstance[], n: number = 1) => {
    Object.entries(spies).forEach(([key, spy]) => {
      const foundIndex = events.findIndex((e) => e === spy);
      if (foundIndex >= 0) {
        if (spy.mock.calls.length !== n) {
          throw new Error(
            `Expected "${key}" to have been called ${n} times but called ${spy.mock.calls.length}`
          );
        }
      } else if (spy.mock.calls.length !== 0) {
        throw new Error(
          `Expected "${key}" to have been called 0 times but called ${spy.mock.calls.length}`
        );
      }
    });
  };

  const assertEventCalledWith = (
    spy: jest.SpyInstance,
    call: number,
    data: { [key: string]: any }
  ) => {
    expect(Object.keys(spy.mock.calls[call - 1][0]).length).toBe(
      Object.keys(data).length
    );
    Object.entries(data).forEach(([key, value]) => {
      expect(spy.mock.calls[call - 1][0][key]).toEqual(value);
    });
  };

  beforeAll(async () => {
    manager = await DocumentManager.create({
      connection: {
        uri: 'mongodb://localhost:31000',
        database: 'test'
      },
      documents: [Event],
      subscribers: [new NoopListener()]
    });

    meta = manager.getMetadataFor(Event);
    repository = manager.getRepository(Event);

    // single documents
    spies.beforeInsert = jest.spyOn(NoopListener.prototype, 'beforeInsert');
    spies.afterInsert = jest.spyOn(NoopListener.prototype, 'afterInsert');
    spies.beforeUpdate = jest.spyOn(NoopListener.prototype, 'beforeUpdate');
    spies.afterUpdate = jest.spyOn(NoopListener.prototype, 'afterUpdate');
    spies.beforeDelete = jest.spyOn(NoopListener.prototype, 'beforeDelete');
    spies.afterDelete = jest.spyOn(NoopListener.prototype, 'afterDelete');
    spies.beforeReplace = jest.spyOn(NoopListener.prototype, 'beforeReplace');
    spies.afterReplace = jest.spyOn(NoopListener.prototype, 'afterReplace');

    // many documents
    spies.beforeUpdateMany = jest.spyOn(
      NoopListener.prototype,
      'beforeUpdateMany'
    );
    spies.afterUpdateMany = jest.spyOn(
      NoopListener.prototype,
      'afterUpdateMany'
    );
    spies.beforeDeleteMany = jest.spyOn(
      NoopListener.prototype,
      'beforeDeleteMany'
    );
    spies.afterDeleteMany = jest.spyOn(
      NoopListener.prototype,
      'afterDeleteMany'
    );

    Object.values(spies).forEach((spy) => spy.mockClear());
  });

  afterAll(async () => {
    await meta.db.dropDatabase();
    await manager.close();
  });

  beforeEach(async () => {
    meta.collection.deleteMany({});
    Object.values(spies).forEach((spy) => spy.mockClear());
  });

  test('create() -> single document', async () => {
    const model = await repository.create({});
    assertEventsCalled([spies.beforeInsert, spies.afterInsert], 1);
    assertEventCalledWith(spies.beforeInsert, 1, {
      meta,
      model
    });
    assertEventCalledWith(spies.afterInsert, 1, {
      meta,
      model
    });
  });

  test('create() -> multiple documents', async () => {
    const events = [{ field: 'event1' }, { field: 'event2' }];
    const models = await repository.create(events);
    assertEventsCalled([spies.beforeInsert, spies.afterInsert], 2);
    assertEventCalledWith(spies.beforeInsert, 1, {
      meta,
      model: models[0]
    });
    assertEventCalledWith(spies.beforeInsert, 2, {
      meta,
      model: models[1]
    });
    assertEventCalledWith(spies.afterInsert, 1, {
      meta,
      model: models[0]
    });
    assertEventCalledWith(spies.afterInsert, 2, {
      meta,
      model: models[1]
    });
  });

  test('insertOne()', async () => {
    const model = Object.assign(new Event(), { field: 'event' });
    await repository.insertOne(model);
    assertEventsCalled([spies.beforeInsert, spies.afterInsert]);
    assertEventCalledWith(spies.beforeInsert, 1, {
      meta,
      model
    });
    assertEventCalledWith(spies.afterInsert, 1, {
      meta,
      model
    });
  });

  test('insertMany()', async () => {
    const models = [
      Object.assign(new Event(), { field: 'event1' }),
      Object.assign(new Event(), { field: 'event2' })
    ];

    await repository.insertMany(models);
    assertEventsCalled([spies.beforeInsert, spies.afterInsert], 2);
    assertEventCalledWith(spies.beforeInsert, 1, {
      meta,
      model: models[0]
    });
    assertEventCalledWith(spies.beforeInsert, 2, {
      meta,
      model: models[1]
    });
    assertEventCalledWith(spies.afterInsert, 1, {
      meta,
      model: models[0]
    });
    assertEventCalledWith(spies.afterInsert, 2, {
      meta,
      model: models[1]
    });
  });

  test('findOneAndUpdate()', async () => {
    const filter = {};
    const update = { $set: { field: 'event' } };
    await repository.findOneAndUpdate(filter, update);
    assertEventsCalled([spies.beforeUpdate, spies.afterUpdate]);
    assertEventCalledWith(spies.beforeUpdate, 1, {
      meta,
      filter,
      update
    });
    assertEventCalledWith(spies.afterUpdate, 1, {
      meta,
      filter,
      update
    });
  });

  test('findOneAndReplace() -> does not have events', async () => {
    const model = Object.assign(new Event(), { field: 'event' });
    await repository.findOneAndReplace({}, model);
    assertEventsCalled([]);
  });

  test('findOneAndDelete()', async () => {
    const filter = {};
    await repository.findOneAndDelete(filter);
    assertEventsCalled([spies.beforeDelete, spies.afterDelete]);
    assertEventCalledWith(spies.beforeDelete, 1, {
      meta,
      filter
    });
    assertEventCalledWith(spies.afterDelete, 1, {
      meta,
      filter
    });
  });

  test('updateOne() -> beforeUpdate & afterUpdate called', async () => {
    const filter = {};
    const update = { $set: { field: 'event' } };
    await repository.updateOne(filter, update);
    assertEventsCalled([spies.beforeUpdate, spies.afterUpdate]);
    assertEventCalledWith(spies.beforeUpdate, 1, {
      meta,
      filter,
      update
    });
    assertEventCalledWith(spies.afterUpdate, 1, {
      meta,
      filter,
      update
    });
  });

  test('updateMany() -> beforeUpdate & afterUpdate called', async () => {
    const filter = {};
    const update = { $set: { field: 'event' } };
    await repository.updateMany(filter, update);
    assertEventsCalled([spies.beforeUpdateMany, spies.afterUpdateMany]);
    assertEventCalledWith(spies.beforeUpdateMany, 1, {
      meta,
      filter,
      update
    });
    assertEventCalledWith(spies.afterUpdateMany, 1, {
      meta,
      filter,
      update
    });
  });

  test('replaceOne() -> beforeReplace & afterReplace called', async () => {
    const filter = {};
    const model = Object.assign(new Event(), { field: 'event' });
    await repository.replaceOne(filter, model);
    assertEventsCalled([spies.beforeReplace, spies.afterReplace]);
    assertEventCalledWith(spies.beforeReplace, 1, {
      meta,
      model,
      filter
    });
    assertEventCalledWith(spies.afterReplace, 1, {
      meta,
      model,
      filter
    });
  });

  test('replaceById() -> beforeReplace & afterReplace called', async () => {
    const id = repository.id();
    const model = Object.assign(new Event(), { _id: id, field: 'event' });
    await repository.replaceById(id, model);
    assertEventsCalled([spies.beforeReplace, spies.afterReplace]);
    assertEventCalledWith(spies.beforeReplace, 1, {
      meta,
      model,
      filter: { _id: id }
    });
    assertEventCalledWith(spies.afterReplace, 1, {
      meta,
      model,
      filter: { _id: id }
    });
  });

  test('deleteOne()', async () => {
    const filter = {};
    await repository.deleteOne(filter);
    assertEventsCalled([spies.beforeDelete, spies.afterDelete]);
    assertEventCalledWith(spies.beforeDelete, 1, {
      meta,
      filter
    });
    assertEventCalledWith(spies.afterDelete, 1, {
      meta,
      filter
    });
  });

  test('deleteMany()', async () => {
    const filter = {};
    await repository.deleteMany(filter);
    assertEventsCalled([spies.beforeDeleteMany, spies.afterDeleteMany]);
    assertEventCalledWith(spies.beforeDeleteMany, 1, {
      meta,
      filter
    });
    assertEventCalledWith(spies.afterDeleteMany, 1, {
      meta,
      filter
    });
  });
});
