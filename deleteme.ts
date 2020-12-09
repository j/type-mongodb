import { Parent } from './tests/__fixtures__/Parent';
import { DocumentManager } from './src';

(async () => {
  const manager = await DocumentManager.create({
    connection: {
      uri: 'mongodb://localhost:31000',
      database: 'test'
    },
    documents: [Parent]
  });

  const doc = {
    sibling: {
      name: 'John',
      sibling: { name: 'Jack' },
      siblings: [{ name: 'Nick' }]
    },
    siblings: [
      { name: 'Betty', sibling: { name: 'Jack' }, siblings: [{ name: 'Nick' }] }
    ]
  };

  const parent = manager.fromDB(Parent, doc);

  console.log(parent);

  console.log(parent.sibling.parent);

  // const doc = transformer.toDB(user);
  //
  // console.log(doc);

  await manager.close();
})().catch(console.error);
