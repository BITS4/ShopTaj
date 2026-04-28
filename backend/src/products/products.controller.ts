import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  findFeatured() {
    return this.productsService.findFeatured();
  }

  @Get('new-arrivals')
  findNewArrivals() {
    return this.productsService.findNewArrivals();
  }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return this.productsService.getAutocomplete(q || '');
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
