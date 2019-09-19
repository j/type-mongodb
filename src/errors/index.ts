export class TypeMongoError extends Error {
  constructor(message: string) {
    super(message);

    Error.captureStackTrace(this, TypeMongoError);
  }
}
