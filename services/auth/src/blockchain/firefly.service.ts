import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

interface FireflyStatus {
  org: {
    id: string;
    did: string;
    verifiers?: Array<{ type: string; value: string }>;
  };
}

interface FireflyIdentity {
  id: string;
  did: string;
  name: string;
  type: string;
  parent: string;
}

@Injectable()
export class FireflyService {
  private readonly logger = new Logger(FireflyService.name);
  private baseUrl!: string;
  private orgId?: string;
  private verifierKey?: string;
  private initialized = false;

  constructor(private readonly httpService: HttpService) {}

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    this.baseUrl = process.env.FIREFLY_API_URL!;
    if (!this.baseUrl) {
      throw new Error('FIREFLY_API_URL is not defined');
    }

    await this.fetchOrganizationKeys();
    this.initialized = true;
  }

  private async fetchOrganizationKeys(): Promise<void> {
    const statusRes = await firstValueFrom(
      this.httpService.get<FireflyStatus>(`${this.baseUrl}/status`),
    );

    this.orgId = statusRes.data.org.id;

    const verifier = statusRes.data.org.verifiers?.[0]?.value;
    if (!verifier) {
      const verifiersRes = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/verifiers`),
      );
      this.verifierKey = verifiersRes.data?.[0]?.value;
    } else {
      this.verifierKey = verifier;
    }

    if (!this.verifierKey) {
      throw new Error('No blockchain key available from FireFly');
    }

    this.logger.log(`FireFly org initialized: ${this.orgId}`);
  }

  async createIdentity(payload: { name: string; parentDid: string }): Promise<string> {
    return this.createChildIdentity({ name: payload.name });
  }

  async createChildIdentity(payload: { name: string }): Promise<string> {
    await this.ensureInitialized();

    const maxAttempts = 3;
    const retryDelayMs = 3000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const postRes = await firstValueFrom(
          this.httpService.post<{ id: string; did: string }>(
            `${this.baseUrl}/identities?confirm=true`,
            {
              name: payload.name,
              type: 'custom',
              parent: this.orgId,
              key: this.verifierKey,
            },
          ),
        );

        const identity = postRes.data;
        if (!identity.id) {
          throw new Error('FireFly POST did not return identity ID');
        }

        if (!identity.did) {
          throw new Error('FireFly POST with confirm=true did not return confirmed DID');
        }

        this.logger.log(`Identity confirmed: ${identity.did}`);
        return identity.did;
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        this.logger.warn(
          `Identity creation attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (isLastAttempt) {
          throw new Error(
            `Identity creation failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        this.logger.log(`Retrying in ${retryDelayMs / 1000}s...`);
        await this.delay(retryDelayMs);
      }
    }

    throw new Error('Identity creation failed: unexpected code path');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}