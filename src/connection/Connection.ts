import { MongoClient } from 'mongodb';

export class Connection {
  constructor(
    public readonly client: MongoClient,
    public readonly name: string,
    public readonly database: string
  ) {}
}
