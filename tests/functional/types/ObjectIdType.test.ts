import 'reflect-metadata';
import { ObjectId } from 'mongodb';
import { ObjectIdType } from '../../../src';

describe('ObjectIdType', () => {
  test('createJSValue', () => {
    const result = new ObjectIdType().createJSValue();
    expect(result).toBeInstanceOf(ObjectId);
  });
  test('createJSValue with string object id', () => {
    const result = new ObjectIdType().createJSValue('5fff8a8f02c6a801545b9789');
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toEqual('5fff8a8f02c6a801545b9789');
  });
  test('createJSValue with string object id instance', () => {
    const result = new ObjectIdType().createJSValue(
      new ObjectId('5fff8a8f02c6a801545b9789')
    );
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toEqual('5fff8a8f02c6a801545b9789');
  });
  test('convertToDatabaseValue', () => {
    const result = new ObjectIdType().convertToDatabaseValue(
      '5fff8a8f02c6a801545b9789'
    );
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
  test('convertToDatabaseValue using ObjectId instance', () => {
    const result = new ObjectIdType().convertToDatabaseValue(
      new ObjectId('5fff8a8f02c6a801545b9789')
    );
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
  test('convertToJSValue', () => {
    const result = new ObjectIdType().convertToJSValue(
      new ObjectId('5fff8a8f02c6a801545b9789')
    );
    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toHexString()).toBe('5fff8a8f02c6a801545b9789');
  });
});
