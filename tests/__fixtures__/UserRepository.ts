import { Repository } from '../../src';
import { User } from './User';

export class UserRepository extends Repository<User> {
  async findActiveUsers(): Promise<User[]> {
    return this.find({ isActive: true }).toArray();
  }
}
