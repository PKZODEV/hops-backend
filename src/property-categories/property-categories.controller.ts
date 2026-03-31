import { Controller, Get } from '@nestjs/common';
import { PropertyCategoriesService } from './property-categories.service';

@Controller('property-categories')
export class PropertyCategoriesController {
  constructor(private readonly service: PropertyCategoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
