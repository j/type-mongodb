import {
  SessionOptions,
  TransactionOptions,
  ClientSession,
  MongoClient,
  WithTransactionCallback
} from 'mongodb';
import { DocumentClass } from '../types';
import { DocumentManager } from '../DocumentManager';
import { TransactionRepository } from '../repository/TransactionRepository';

declare module 'mongodb' {
  interface MongoError {
    hasErrorLabel(label: string): boolean;
    writeConcernError: WriteConcernError;
  }
}

interface Config {
  session?: SessionOptions;
  transaction?: TransactionOptions;
}

export enum SessionState {
  Pending,
  InProgress,
  Done
}

export class Session {
  protected client: MongoClient;
  protected session: ClientSession;
  protected state: SessionState = SessionState.Pending;
  protected config: Config = {
    session: undefined,
    transaction: undefined
  };

  constructor(protected dm: DocumentManager) {
    this.client = dm.connection.client;
  }

  setSessionOptions(opts: SessionOptions): this {
    this.config.session = opts;

    return this;
  }

  setTransactionOptions(opts: TransactionOptions): this {
    this.config.transaction = opts;

    return this;
  }

  async withTransaction<T>(fn: WithTransactionCallback<T>): Promise<T> {
    this.assertTransactionState(SessionState.Pending);

    let result: T;

    try {
      this.state = SessionState.InProgress;
      this.session = this.client.startSession();

      await this.session.withTransaction(async (session: ClientSession) => {
        result = await fn(session);
      }, this.config.transaction);
    } catch (err) {
      throw err;
    } finally {
      this.state = SessionState.Done;
      this.session.endSession();
    }

    return result;
  }

  getRepository<T>(target: DocumentClass<T>): TransactionRepository<T> {
    this.assertTransactionState(SessionState.InProgress);

    return new TransactionRepository(
      this.dm.getRepository(target),
      this.session
    );
  }

  protected assertTransactionState(state: SessionState) {
    if (state === this.state) {
      return;
    }

    switch (this.state) {
      case SessionState.Pending:
        throw new Error('Transaction not yet started');
      case SessionState.InProgress:
        throw new Error('Transaction currently in progress');
      case SessionState.Done:
        throw new Error('Transaction already completed');
      default:
        throw new Error('Unknown transaction state');
    }
  }
}
