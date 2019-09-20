import { Newable } from '../common/types';

export interface ContainerType {
  get<T>(InstanceClass: Newable<T>): T;
}

export class DefaultContainer implements ContainerType {
  private instances = new Map<Newable, any>();

  get<T>(InstanceClass: Newable<T>): T {
    if (this.instances.has(InstanceClass)) {
      return this.instances.get(InstanceClass);
    }

    const instance = new InstanceClass();

    this.instances.set(InstanceClass, instance);

    return instance;
  }
}

export class Container {
  protected readonly defaultContainer: DefaultContainer;

  constructor(protected userContainer?: ContainerType) {
    this.defaultContainer = new DefaultContainer();
  }

  get<T>(InstanceClass: Newable<T>): T {
    return this.userContainer
      ? this.userContainer.get(InstanceClass)
      : this.defaultContainer.get(InstanceClass);
  }
}
