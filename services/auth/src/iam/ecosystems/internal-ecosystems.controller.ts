import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, Post } from '@nestjs/common';
import { EcosystemsService } from './ecosystems.service';
import { ValidateApiKeyDto } from './dto/validate-api-key.dto';
import { SignHashDto } from './dto/sign-hash.dto';

@Controller('internal/users')
export class InternalUsersController {
  constructor(private readonly ecosystemsService: EcosystemsService) {}

  private validateInternalToken(authorization: string | undefined): void {
    const expectedInternalToken = process.env.AUTH_INTERNAL_TOKEN?.trim();

    if (expectedInternalToken) {
      const bearerToken = authorization?.trim().startsWith('Bearer ')
        ? authorization.trim().slice('Bearer '.length).trim()
        : undefined;

      if (bearerToken !== expectedInternalToken) {
        throw new ForbiddenException('No tienes permisos para usar esta ruta');
      }
    }
  }

  @Post('validate-ecosystem')
  async validateApiKey(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() validateApiKeyDto: ValidateApiKeyDto,
  ) {
    this.validateInternalToken(authorization);

    if (!apiKey?.trim()) {
      throw new BadRequestException('x-api-key header is required');
    }

    return this.ecosystemsService.validateApiKey(
      apiKey,
      validateApiKeyDto.latitude,
      validateApiKeyDto.longitude,
    );
  }

  @Post('sign')
  async signHash(
    @Headers('authorization') authorization: string | undefined,
    @Body() signHashDto: SignHashDto,
  ) {
    this.validateInternalToken(authorization);

    return this.ecosystemsService.signHash(
      signHashDto.ecosystemId,
      signHashDto.hash,
    );
  }

  @Get(':userId/ecosystems')
  async getUserEcosystems(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
  ) {
    this.validateInternalToken(authorization);

    if (!userId?.trim()) {
      throw new BadRequestException('userId is required');
    }

    return this.ecosystemsService.findEcosystemsByOwnerId(userId.trim());
  }
}