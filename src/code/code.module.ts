import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CodeService } from './services/code.service.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'ICodeService',
      useClass: CodeService,
    },
  ],
  exports: ['ICodeService'],
})
export class CodeModule {}