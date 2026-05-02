import { Module } from '@nestjs/common';
import { BePaidService } from './bepaid.service';

@Module({ providers: [BePaidService], exports: [BePaidService] })
export class BePaidModule {}
