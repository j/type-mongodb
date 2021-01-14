import 'reflect-metadata';
import { ObjectId } from 'mongodb';
import { ObjectIdType } from '../../../src';

describe('ObjectIdType', () => {
  test('touch', () => {
    const result = new ObjectIdType().touch();
    expect(result).toBeInstanceOf(ObjectId);
  });
  test('touch with string value', () => {
    const result = new ObjectIdType().touch('5fff8a8f02c6a801545b9789');
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
  test('touch with ObjectId value', () => {
    const result = new ObjectIdType().touch(
      new ObjectId('5fff8a8f02c6a801545b9789')
    );
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
  test('toDB', () => {
    const result = new ObjectIdType().toDB('5fff8a8f02c6a801545b9789');
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
  test('toDB using ObjectId instance', () => {
    const result = new ObjectIdType().toDB(
      new ObjectId('5fff8a8f02c6a801545b9789')
    );
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
  test('fromDB', () => {
    const result = new ObjectIdType().fromDB(
      new ObjectId('5fff8a8f02c6a801545b9789')
    );
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
});
