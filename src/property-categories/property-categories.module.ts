import { Module } from '@nestjs/common';
import { PropertyCategoriesController } from './property-categories.controller';
import { PropertyCategoriesService } from './property-categories.service';

@Module({
  controllers: [PropertyCategoriesController],
  providers: [PropertyCategoriesService],
})
export class PropertyCategoriesModule {}
