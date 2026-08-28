import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private repo: Repository<Material>,
  ) {}

  findAll(entity?: string) {
    return this.repo.find({
      where: entity ? { entity } : {},
      order: { name: 'ASC' },
    });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  create(dto: CreateMaterialDto) {
    return this.repo.save(this.repo.create(dto));
  }
}
