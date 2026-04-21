import { BadRequestException, Body, Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { EcosystemsService } from './ecosystems.service';
import { ValidateApiKeyDto } from './dto/validate-api-key.dto';

@Controller('internal/auth')
export class InternalAuthController {
  constructor(private readonly ecosystemsService: EcosystemsService) {}

  @Post('validate-ecosystem')
  async validateApiKey(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() validateApiKeyDto: ValidateApiKeyDto,
  ) {
    const expectedInternalToken = process.env.AUTH_INTERNAL_TOKEN?.trim();

    if (expectedInternalToken) {
      const bearerToken = authorization?.trim().startsWith('Bearer ')
        ? authorization.trim().slice('Bearer '.length).trim()
        : undefined;

      if (bearerToken !== expectedInternalToken) {
        throw new ForbiddenException('No tienes permisos para usar esta ruta');
      }
    }

    if (!apiKey?.trim()) {
      throw new BadRequestException('x-api-key header is required');
    }

    return this.ecosystemsService.validateApiKey(
      apiKey,
      validateApiKeyDto.latitude,
      validateApiKeyDto.longitude,
    );
  }
}