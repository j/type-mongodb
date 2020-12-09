import { BenchSuite } from './bench';
import { DocumentManager } from '../src';
import { Simple } from '../tests/__fixtures__/Simple';
import { User } from '../tests/__fixtures__/User';
import { ObjectId } from 'mongodb';

export async function main() {
  const count = 10_000;

  const manager = await DocumentManager.create({
    connection: {
      uri: 'mongodb://localhost:31000',
      database: 'test'
    },
    documents: [Simple, User]
  });

  const repository = manager.getRepository(User);

  for (let i = 0; i < 5; i++) {
    console.log(`Round ${i}`);

    const suite = new BenchSuite('find');

    await repository.deleteMany({});

    await suite.runAsyncFix(1, 'insert', async () => {
      let users: User[] = [];

      for (let i = 1; i <= count; i++) {
        const user = repository.init({
          _id: new ObjectId(),
          name: `User ${i}`,
          address: {
            city: 'San Diego',
            state: 'CA'
          },
          reviews: [
            { product: { sku: '1', title: 'Poster' }, rating: 10 },
            { product: { sku: '2', title: 'Frame' }, rating: 5 }
          ],
          isActive: true,
          createdAt: new Date('2020-01-01')
        });

        users.push(user);
      }

      await repository.insertMany(users);
    });

    await suite.runAsyncFix(10, 'fetch', async () => {
      await repository.find().limit(count).toArray();
    });

    const items = await repository.find().limit(count).toArray();

    await suite.runAsyncFix(10, 'toDB', async () => {
      items.map((item) => repository.toDB(item));
    });
  }

  await manager.close();
}

main();
