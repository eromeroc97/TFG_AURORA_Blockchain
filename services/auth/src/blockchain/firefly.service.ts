import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FireflyService {
  private readonly logger = new Logger(FireflyService.name);

  constructor(private readonly httpService: HttpService) {}

  async registerIdentity(email: string): Promise<string> {
    const baseUrl = process.env.FIREFLY_API_URL;

    if (!baseUrl) {
      const fallbackDid = `did:firefly:offline-generated-${Date.now()}`;
      console.warn('FIREFLY_API_URL is not configured. Using fallback DID.', {
        email,
        fallbackDid,
      });
      return fallbackDid;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}/identities`, {
          name: email,
          description: 'IAM User',
        }),
      );

      const generatedDid = response.data?.did ?? response.data?.id;

      if (typeof generatedDid === 'string' && generatedDid.length > 0) {
        return generatedDid;
      }

      const fallbackDid = `did:firefly:offline-generated-${Date.now()}`;
      console.warn('FireFly response did not contain did/id. Using fallback DID.', {
        email,
        fallbackDid,
        responseData: response.data,
      });

      return fallbackDid;
    } catch (error) {
      const fallbackDid = `did:firefly:offline-generated-${Date.now()}`;
      this.logger.warn(`FireFly identity registration failed for ${email}`, error as Error);
      console.warn('FireFly identity registration failed. Using fallback DID.', {
        email,
        fallbackDid,
        error,
      });

      return fallbackDid;
    }
  }
}