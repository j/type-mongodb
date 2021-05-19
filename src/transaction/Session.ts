import {
  TransactionOptions,
  ClientSession,
  ClientSessionOptions,
  MongoClient,
  WithTransactionCallback
} from 'mongodb';
import { DocumentClass } from '../typings';
import { DocumentManager } from '../DocumentManager';
import { TransactionRepository } from '../repository/TransactionRepository';
import { InternalError } from '../errors';

export enum SessionState {
  Pending,
  InProgress,
  Done
}

export class Session {
  protected client: MongoClient;
  protected session: ClientSession;
  protected state: SessionState = SessionState.Pending;
  protected transactionOptions: TransactionOptions;
  protected sessionOptions: ClientSessionOptions;

  constructor(protected dm: DocumentManager) {
    this.client = dm.connection.client;
  }

  setSessionOptions(opts: ClientSessionOptions): this {
    this.sessionOptions = opts;

    return this;
  }

  setTransactionOptions(opts: TransactionOptions): this {
    this.transactionOptions = opts;

    return this;
  }

  startSession(): ClientSession {
    return this.client.startSession(this.sessionOptions);
  }

  async withTransaction<T>(fn: WithTransactionCallback<T>): Promise<T | void> {
    this.assertTransactionState(SessionState.Pending);

    let result: T | void;

    try {
      this.state = SessionState.InProgress;
      this.session = this.startSession();

      result = await this.session.withTransaction<T>(
        async (session: ClientSession): Promise<T> => {
          return (await fn(session)) as T;
        },
        this.transactionOptions
      );
    } catch (err) {
      throw err;
    } finally {
      this.state = SessionState.Done;
      await this.session.endSession();
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

  protected assertTransactionState(state: SessionState): void {
    if (state === this.state) {
      return;
    }

    switch (this.state) {
      case SessionState.Pending:
        return InternalError.throw('Transaction not yet started');
      case SessionState.InProgress:
        return InternalError.throw('Transaction currently in progress');
      case SessionState.Done:
        return InternalError.throw('Transaction already completed');
      default:
        return InternalError.throw('Unknown transaction state');
    }
  }
}
