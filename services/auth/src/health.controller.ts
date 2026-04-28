import { Controller, Get, Header, Options } from '@nestjs/common';

@Controller()
export class HealthController {
  @Options('health')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET,OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type,Accept')
  optionsHealth() {
    return ''
  }

  @Get('health')
  @Header('Access-Control-Allow-Origin', '*')
  getHealth() {
    return {
      status: 'UP',
      service: 'auth',
    };
  }
}
