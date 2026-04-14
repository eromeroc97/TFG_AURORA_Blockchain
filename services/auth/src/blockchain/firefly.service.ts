import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FireflyService {
  private readonly logger = new Logger(FireflyService.name);

  constructor(private readonly httpService: HttpService) {}

  async getOrganizationDid(): Promise<string> {
    const baseUrl = process.env.FIREFLY_API_URL;

    if (!baseUrl) {
      return 'did:firefly:offline-generated-org';
    }

    try {
      const orgRes = await this.httpService.axiosRef.get(`${process.env.FIREFLY_API_URL}/identities?type=org`);

      if (Array.isArray(orgRes.data) && orgRes.data.length > 0 && typeof orgRes.data[0]?.did === 'string') {
        return orgRes.data[0].did;
      }

      return 'did:firefly:offline-generated-org';
    } catch (error) {
      this.logger.warn('FireFly organization DID lookup failed. Using fallback DID.', error as Error);
      return 'did:firefly:offline-generated-org';
    }
  }
}