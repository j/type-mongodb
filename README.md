<h1 align="center" style="border-bottom: none;">🔗 type-mongodb</h1>
<h3 align="center">A simple <a href="https://www.typescriptlang.org/docs/handbook/decorators.html">@decorator</a> based <a href="https://www.mongodb.com/">MongoDB</a> ODM.</h3>

**type-mongodb** makes it easy to map classes to MongoDB documents and back using `@decorators`.

## Features

- Extremely simply `@Decorator()` based document mapping
- Very fast 🚀! (thanks to JIT compilation)
- RAW. MongoDB is already extremely easy to use. It's best to use the driver
  as it's intended. No validation, no change-set tracking, no magic -- just class mapping
- Custom Repositories
- Event Subscribers
- Transaction Support
- Discriminator Mapping
- & more!

## How to use

`type-orm` allows you to create a base document class for common functionality. Notice
that we don't enforce strict types. MongoDB is "schema-less", so we've decided to just
support their main types and not do anything fancy. Again, we wanted to keep it as close
to the core driver as possible.

```typescript
import { Field } from 'type-mongodb';
import { ObjectId } from 'mongodb';

abstract class BaseDocument {
  @Field()
  _id: ObjectId = new ObjectId();

  get id(): string {
    return this._id.toHexString();
  }

  @Field()
  createdAt: Date = new Date();

  @Field()
  updatedAt: Date = new Date();
}
```

Now create our document class with some fields.

```typescript
import { Document, Field } from 'type-mongodb';
import { BaseDocument, Address, Pet } from './models';

@Document()
class User extends BaseDocument {
  @Field()
  name: string;

  @Field(() => Address)
  address: Address; // single embedded document

  @Field(() => [Address])
  addresses: Address[] = []; // array of embedded documents

  @Field(() => [Pet])
  pets: Pet[] = []; // array of discriminator mapped documents

  @Field(() => [Pet])
  favoritePet: Pet = []; // single discriminator mapped document
}
```

And here's the embedded `Address` document.

```typescript
import { Field } from 'type-mongodb';

class Address {
  @Field()
  city: string;

  @Field()
  state: string;
}
```

`type-mongodb` also has support for discriminator mapping (polymorphism). You do this
by creating a base class mapped by `@Discriminator({ property: '...' })` with a `@Field()` with the
name of the "property". Then decorate discriminator types with `@Discriminator({ value: '...' })`
and `type-mongodb` takes care of the rest.

```typescript
import { Discriminator, Field } from 'type-mongodb';

@Discriminator({ property: 'type' })
abstract class Pet {
  @Field()
  abstract type: string;

  @Field()
  abstract sound: string;

  speak(): string {
    return this.sound;
  }
}

@Discriminator({ value: 'dog' })
class Dog extends Pet {
  type: string = 'dog';
  sound: string = 'ruff';

  // dog specific fields & methods
}

@Discriminator({ value: 'cat' })
class Cat extends Pet {
  type: string = 'cat';
  sound: string = 'meow';

  // cat specific fields & methods
}
```

And now, lets see the magic!

```typescript
import { DocumentManager } from 'type-mongodb';
import { User } from './models';

async () => {
  const dm = await DocumentManager.create({
    connection: {
      uri: process.env.MONGO_URI,
      database: process.env.MONGO_DB
    },
    documents: [User]
  });

  const repository = dm.getRepository(User);

  await repository.create({
    name: 'John Doe',
    address: {
      city: 'San Diego',
      state: 'CA'
    },
    addresses: [
      {
        city: 'San Diego',
        state: 'CA'
      }
    ],
    pets: [{ type: 'dog', sound: 'ruff' }],
    favoritePet: { type: 'dog', sound: 'ruff' }
  });

  const users = await repository.find().toArray();
};
```

What about custom repositories? Well, that's easy too:

```typescript
import { Repository } from 'type-mongodb';
import { User } from './models';

export class UserRepository extends Repository<User> {
  async findJohnDoe(): Promise<User> {
    return this.findOneOrFail({ name: 'John Doe' });
  }
}
```

Then register this repository with the `User` class:

```typescript
import { UserRepository } from './repositories';
// ...

@Document({ repository: () => UserRepository })
class User extends BaseDocument {
  // ...
}
```

... and finally, to use:

```typescript
const repository = dm.getRepository<UserRepository>(User);
```

What about events? We want the base class to have createdAt and updatedAt be mapped
correctly.

```typescript
import {
  EventSubscriber,
  DocumentManager,
  InsertEvent,
  UpdateEvent
} from 'type-mongodb';
import { BaseDocument } from './models';

export class TimestampableSubscriber implements EventSubscriber<BaseDocument> {
  // Find all documents that extend BaseDocument
  getSubscribedDocuments?(dm: DocumentManager): any[] {
    return dm
      .filterMetadata(
        (meta) => meta.DocumentClass.prototype instanceof BaseDocument
      )
      .map((meta) => meta.DocumentClass);
  }

  beforeInsert(e: InsertEvent<BaseDocument>) {
    if (!e.model.updatedAt) {
      e.model.updatedAt = new Date();
    }

    if (!e.model.createdAt) {
      e.model.createdAt = new Date();
    }
  }

  beforeUpdate(e: UpdateEvent<BaseDocument>) {
    this.prepareUpdate(e);
  }

  beforeUpdateMany(e: UpdateEvent<BaseDocument>) {
    this.prepareUpdate(e);
  }

  prepareUpdate(e: UpdateEvent<BaseDocument>) {
    e.update.$set = {
      updatedAt: new Date(),
      ...(e.update.$set || {})
    };

    e.update.$setOnInsert = {
      createdAt: new Date(),
      ...(e.update.$setOnInsert || {})
    };
  }
}
```

...then register TimestampableSubscriber:

```typescript
const dm = await DocumentManager.create({
  /// ...,
  subscribers: [TimestampableSubscriber]
});
```

#### Other Common Features

```typescript
// custom collection and database
@Document({ database: 'app', collection: 'users' })

// using internal hydration methods
dm.toDB(User, user);
dm.fromDB(User, { /* document class */ });
dm.init(User, { /* user props */ });
dm.merge(User, user, { /* user props */ });
```

For more advanced usage and examples, check out the tests.
