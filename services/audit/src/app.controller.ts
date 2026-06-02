import { Controller, Get, Header, Options } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Options('health')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET,OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type,Accept')
  optionsHealth() {
    return '';
  }

  @Get('health')
  @Header('Access-Control-Allow-Origin', '*')
  getHealth() {
    return this.appService.getHealth();
  }
}
