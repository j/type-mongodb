import {
  Document,
  Id,
  Field,
  UUIDType,
  ObjectIdType,
  DocumentRepository
} from '../../src';
import { ObjectId } from 'mongodb';
import { UserRepository } from './UserRepository';

export class Address {
  @Field({ type: UUIDType, name: 'uid' })
  uuid: string;

  @Field()
  city: string;

  @Field()
  state: string;
}

export class Product {
  @Field({ type: UUIDType, name: 'uid' })
  uuid: string;

  @Field()
  sku: string;

  @Field()
  title: string;
}

export class Review {
  @Field({ type: UUIDType, name: 'uid' })
  uuid: string;

  @Field(() => Product)
  product: Product;

  @Field()
  rating: number;

  @Field({ type: UUIDType })
  productUUIDs: string[];
}

@Document({ repository: () => UserRepository })
export class User {
  [DocumentRepository]: UserRepository;

  @Id()
  _id: ObjectId;

  @Field({ type: UUIDType, name: 'uid' })
  uuid: string;

  @Field()
  name: string;

  @Field(() => Address)
  address: Address;

  @Field(() => [Review])
  reviews: Review[] = [];

  @Field({ type: UUIDType })
  topReviews: string[];

  @Field({ type: ObjectIdType })
  bestFriends: ObjectId[];

  @Field()
  createdAt: Date;

  @Field()
  isActive: boolean;
}

export function createUserDocs(): { john: any; mary: any } {
  const john = {
    _id: new ObjectId(),
    name: 'John',
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
  };

  const mary = {
    _id: new ObjectId(),
    name: 'Mary',
    address: {
      city: 'New York City',
      state: 'NY'
    },
    reviews: [],
    isActive: false,
    createdAt: new Date('2020-01-02')
  };

  return { john, mary };
}

export function createUsers(docs?: any): { john: User; mary: User } {
  docs = docs || createUserDocs();

  const create = (data: any): User => {
    const copy = {
      ...data,
      reviews: [...data.reviews],
      address: { ...data.address }
    };

    return Object.assign(new User(), {
      ...copy,
      reviews: (copy.reviews || {}).map((review: Partial<Review>) =>
        Object.assign(new Review(), {
          ...review,
          product: Object.assign(new Product(), review.product)
        })
      ),
      address: Object.assign(new Address(), copy.address)
    });
  };

  return {
    john: create(docs.john),
    mary: create(docs.mary)
  };
}
