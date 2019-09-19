import { Newable } from '../common/types';
import { Model } from '../Model';
import { DocumentMetadata } from '../metadata/DocumentMetadata';

export interface ContainerType {
  get<T>(target: Newable<T>): T;
  has(target: any): boolean;
  set(target: any, value: any): void;
}

export class DefaultContainer implements ContainerType {
  private map = new Map<Newable<any>, any>();

  get<T>(target: Newable<T>): T {
    return this.map.get(target);
  }

  has(target: any): any {
    return this.map.has(target);
  }

  set(target: any, value: any): void {
    this.map.set(target, value);
  }
}

export class Container {
  private container: ContainerType;

  constructor(container?: ContainerType) {
    if (!container) {
      this.container = new DefaultContainer();
    }
  }

  get<T extends Model>(target: Newable<T>): DocumentMetadata<T>;
  get<T>(target: Newable<T>): T;
  get<T>(target: Newable<T>): T {
    return this.container.get(target);
  }

  has(target: any): any {
    return this.container.has(target);
  }

  set(target: any, value: any): void {
    this.container.set(target, value);
  }
}
