import 'reflect-metadata';
import { ObjectId } from 'mongodb';
import { DocumentManager } from '../../src/DocumentManager';
import { Discriminator, Document, Field, Parent } from '../../src/decorators';

@Discriminator({
  field: 'type',
  property: 'type',
  map: {
    dog: () => Dog,
    cat: () => Cat
  }
})
abstract class Pet {
  @Parent()
  owner: any;

  @Field()
  abstract type: string;

  @Field()
  sound: string;
}

class Leash {
  @Field()
  brand: string;

  @Field()
  length: number;
}

class Dog extends Pet {
  type: string = 'dog';

  @Field(() => Leash)
  leash: Leash;
}

class Litter {
  @Field()
  brand: string;
}

class Cat extends Pet {
  type: string = 'cat';

  @Field(() => Litter)
  litter: Litter;
}

@Document()
class Person {
  @Field()
  _id: ObjectId;

  @Field(() => [Pet])
  pets: Pet[] = [];

  @Field(() => Pet)
  favoritePet: Dog | Cat;
}

function createFixtures(): { person: Person; dog: Dog; cat: Cat; doc: any } {
  const dog = new Dog();
  dog.leash = Object.assign(new Leash(), { brand: 'Petco', length: 48 });

  const cat = new Cat();
  cat.litter = Object.assign(new Litter(), { brand: 'Costco' });

  const person = new Person();
  person._id = new ObjectId();
  person.pets.push(dog);
  person.pets.push(cat);
  person.favoritePet = dog;
  person.pets.forEach((p) => (p.owner = person));

  const doc = {
    _id: new ObjectId(person._id),
    pets: [
      {
        type: 'dog',
        leash: {
          brand: 'Petco',
          length: 48
        }
      },
      {
        type: 'cat',
        litter: { brand: 'Costco' }
      }
    ],
    favoritePet: {
      type: 'dog',
      leash: {
        brand: 'Petco',
        length: 48
      }
    }
  };

  return { person, dog, cat, doc };
}

describe('Discriminator', () => {
  let manager: DocumentManager;

  beforeAll(async () => {
    manager = await DocumentManager.create({
      connection: {
        uri: 'mongodb://localhost:31000',
        database: 'test'
      },
      documents: [Person]
    });
  });

  afterAll(async () => {
    await manager.close();
  });

  describe('init', () => {
    test('creates model from props', () => {
      const { person } = createFixtures();

      const result = manager.init(Person, {
        _id: new ObjectId(person._id),
        pets: [
          {
            type: 'dog',
            leash: {
              brand: 'Petco',
              length: 48
            }
          },
          {
            type: 'cat',
            litter: { brand: 'Costco' }
          }
        ],
        favoritePet: {
          type: 'dog',
          leash: {
            brand: 'Petco',
            length: 48
          }
        }
      });

      expect(result).toEqual(person);
      expect(result).toBeInstanceOf(Person);
      expect(result.pets[0]).toBeInstanceOf(Dog);
      expect(result.pets[1]).toBeInstanceOf(Cat);
      expect(result.favoritePet).toBeInstanceOf(Dog);
      expect(result.favoritePet.owner).toBe(result);
    });
  });

  describe('merge', () => {
    test('merges into document', () => {
      const person = new Person();
      person._id = new ObjectId();
      person.favoritePet = new Cat();
      person.favoritePet.owner = person;
      person.favoritePet.litter = Object.assign(new Litter(), {
        brand: 'Costco'
      });
      person.pets = [person.favoritePet];

      const result = manager.merge(Person, person, {
        pets: [
          {
            type: 'dog',
            leash: {
              brand: 'Petco',
              length: 48
            }
          },
          {
            type: 'cat',
            litter: { brand: 'Costco' }
          }
        ],
        favoritePet: {
          type: 'dog',
          leash: {
            brand: 'Petco',
            length: 48
          }
        }
      });

      expect(result).toBeInstanceOf(Person);
      expect(result.pets[0]).toBeInstanceOf(Dog);
      expect(result.pets[1]).toBeInstanceOf(Cat);
      expect(result.favoritePet).toBeInstanceOf(Dog);
      expect(result.favoritePet.owner).toBe(result);
    });
  });

  describe('toDB', () => {
    test('converts to document', () => {
      const { person, doc } = createFixtures();

      const result = manager.toDB(Person, person);

      expect(result).toEqual(doc);
      expect(result instanceof Person).toBeFalsy();
      expect(result.pets[0] instanceof Dog).toBeFalsy();
      expect(result.pets[1] instanceof Cat).toBeFalsy();
      expect(result.favoritePet instanceof Dog).toBeFalsy();
      expect(result.favoritePet.owner).toBeUndefined();
    });
  });

  describe('fromDB', () => {
    test('converts from document', () => {
      const { person, doc } = createFixtures();

      const result = manager.fromDB(Person, doc);

      expect(result).toEqual(person);
      expect(result).toBeInstanceOf(Person);
      expect(result.pets[0]).toBeInstanceOf(Dog);
      expect(result.pets[1]).toBeInstanceOf(Cat);
      expect(result.favoritePet).toBeInstanceOf(Dog);
      expect(result.favoritePet.owner).toBe(result);
    });
  });
});
