import { WithId } from 'mongodb';

export type DocumentClass<T = any> = Newable<T>;
export type DocumentInstance<T = any> = WithId<T>;
export type Newable<T = any> = new (...args: any[]) => T;
export type PropsOf<T = any> = { -readonly [P in keyof T]: T[P] };
