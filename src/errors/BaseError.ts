export abstract class BaseError extends Error {
  public isInternal: boolean;

  constructor(message: string, isInternal = true) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.isInternal = isInternal;
  }
}
