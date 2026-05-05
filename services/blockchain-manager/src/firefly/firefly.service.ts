import { Injectable, Module } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class FireflyService {
  private readonly client: AxiosInstance;

  constructor() {
    const apiUrl = process.env.FIREFLY_API_URL || 'http://firefly:5000';
    const apiKey = process.env.FIREFLY_API_KEY || '';

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      timeout: 60000,
    });
  }

  async getNetworkNodes(namespace = 'default') {
    const response = await this.client.get(`/api/v1/namespaces/${namespace}/network/nodes`);
    return response.data;
  }

  async getOrganizations(namespace = 'default') {
    const response = await this.client.get(`/api/v1/namespaces/${namespace}/network/organizations`);
    return response.data;
  }

  async getNamespaces() {
    const response = await this.client.get('/api/v1/namespaces');
    return response.data;
  }

  async getPins(namespace = 'default', options?: { limit?: number; skip?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.skip) params.append('skip', options.skip.toString());
    params.append('sort', '-sequence');

    const response = await this.client.get(`/api/v1/namespaces/${namespace}/pins?${params}`);
    return response.data;
  }

  async getContracts() {
    const response = await this.client.get('/api/v1/apis');
    return response.data;
  }

  async getStatus(namespace = 'default') {
    const response = await this.client.get(`/api/v1/namespaces/${namespace}/status`);
    return response.data;
  }
}

@Module({
  providers: [FireflyService],
  exports: [FireflyService],
})
export class FireflyModule {}