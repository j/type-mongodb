import { MongoClient, MongoClientOptions, Db } from 'mongodb';
import { Connection } from './Connection';

export interface ConnectionManagerOptions {
  database: string;
  name?: string;
  client?: MongoClient;
  uri?: string;
  options?: MongoClientOptions;
}

/**
 * ConnectionManager contains all the configured MongoClients.
 */
export class ConnectionManager {
  public readonly connections: Map<string, Connection> = new Map();

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  addConnection(connection: Connection) {
    this.connections.set(connection.name, connection);
  }

  getConnection(connectionName: string): Connection {
    const connection = this.connections.get(connectionName);

    if (!connection) {
      throw new Error(
        `Connection with name "${connectionName}" does not exist`
      );
    }

    return connection;
  }

  getDatabase(connection: Connection, database?: string): Db {
    return connection.client.db(database || connection.database);
  }

  /**
   * Makes connections to all the configured databases.
   */
  async connect(): Promise<void> {
    const connects: Promise<MongoClient>[] = [];

    if (!this.connections.size) {
      throw new Error('DocumentManager missing "client" or "clients" config');
    }

    for (let connection of this.connections.values()) {
      if (!connection.client.isConnected()) {
        connects.push(connection.client.connect());
      }
    }

    await Promise.all(connects);
  }

  /**
   * Closes all the open connections.
   */
  async close(force?: boolean): Promise<void> {
    const promises: Promise<any>[] = [];

    for (let connection of this.connections.values()) {
      if (connection.client.isConnected()) {
        promises.push(connection.client.close(force));
      }
    }

    await Promise.all(promises);
  }

  // -------------------------------------------------------------------------
  // Static methods
  // -------------------------------------------------------------------------

  static create(opts: ConnectionManagerOptions[]) {
    const manager = new ConnectionManager();

    opts.forEach(({ name, database, client, uri, options }) => {
      if (!client && !uri) {
        throw new Error(
          'Invalid connection config.  Missing "uri" or "client".'
        );
      }

      if (!client) {
        client = new MongoClient(uri, {
          ...(options || {}),
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
      }

      manager.addConnection(
        new Connection(client, name || 'default', database)
      );
    });

    if (!manager.connections.get('default')) {
      manager.connections.set('default', manager.connections.values()[0]);
    }

    return manager;
  }
}
