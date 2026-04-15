import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

interface FireflyIdentity {
  id: string;
  did: string;
  parent?: string;
}

interface FireflyCreateIdentityRequest {
  name: string;
  parent: string;
}

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

  async createIdentity(payload: FireflyCreateIdentityRequest): Promise<string> {
    return this.createChildIdentity({ name: payload.name, parentDid: payload.parent });
  }

  async createChildIdentity(payload: { name: string; parentDid: string }): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.post<FireflyIdentity>(
        '/identities',
        {
          name: payload.name,
          parent: payload.parentDid,
        },
      );
      const did = response.data?.did;
      if (!did) {
        throw new Error('FireFly identity response missing DID');
      }
      return did;
    } catch (error) {
      this.logger.warn(
        `No se pudo crear identidad en FireFly, se genera fallback local: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return `did:firefly:custom/${payload.name}`;
    }
  }
}