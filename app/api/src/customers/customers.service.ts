import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private repo: Repository<Customer>,
  ) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  create(dto: CreateCustomerDto) {
    return this.repo.save(this.repo.create(dto));
  }
}
