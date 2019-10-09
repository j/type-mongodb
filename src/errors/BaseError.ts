export abstract class BaseError extends Error {
  public isInternal: boolean;

  constructor(message: string, isInternal = true) {
    super(message);

    this.isInternal = isInternal;
  }
}
