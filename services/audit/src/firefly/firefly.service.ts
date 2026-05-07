import { Module, Injectable } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FireFlyService {
  private readonly baseUrl: string;
  private readonly namespace: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('FIREFLY_API_URL') || 'http://firefly:5000';
    this.namespace = this.configService.get<string>('FIREFLY_NAMESPACE') || 'default';
    this.apiKey = this.configService.get<string>('FIREFLY_API_KEY') || '';
  }

  getNamespace(): string {
    return this.namespace;
  }

  async getEvents(options?: { 
    limit?: number; 
    skip?: number; 
    filter?: string; 
  }): Promise<any> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.skip) params.append('skip', options.skip.toString());
    if (options?.filter) params.append('filter', options.filter);
    params.append('sort', '-timestamp');

    const url = `${this.baseUrl}/api/v1/namespaces/${this.namespace}/blockchainevents?${params}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    try {
      const response = await firstValueFrom(this.httpService.get(url, { headers }));
      return response.data;
    } catch (error) {
      throw new Error(`FireFly events query failed: ${error.message}`);
    }
  }
}
