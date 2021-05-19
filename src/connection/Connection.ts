import { MongoClient, MongoClientOptions, Db } from 'mongodb';
import { InternalError } from '../errors';

export interface ConnectionOptions {
  database: string;
  client?: MongoClient;
  uri?: string;
  options?: MongoClientOptions;
}

export class Connection {
  private constructor(
    public readonly client: MongoClient,
    public readonly database: string
  ) {}

  getDatabase(connection: Connection, database?: string): Db {
    return this.client.db(database || connection.database);
  }

  /**
   * Makes connections to all the configured databases.
   */
  async connect(): Promise<void> {
    if (!this.isConnected()) {
      await this.client.connect();
    }
  }

  /**
   * Returns true if MongoClient is connected.
   */
  isConnected(): boolean {
    return !!this.client.topology?.isConnected();
  }

  /**
   * Closes all the open connections.
   */
  async close(force?: boolean): Promise<void> {
    if (this.isConnected()) {
      await this.client.close(force);
    }
  }

  static create(opts: ConnectionOptions) {
    if (!opts.client && !opts.uri) {
      InternalError.throw(
        'Invalid connection config.  Missing "uri" or "client".'
      );
    }

    const client = opts.client || new MongoClient(opts.uri, opts.options);

    return new Connection(client, opts.database);
  }
}
