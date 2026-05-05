import { Injectable, Module } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface FireflyNamespace {
  name: string;
  description?: string;
  created?: string;
  initializing?: boolean;
  initializationError?: string;
}

export interface FireflyIdentity {
  id?: string;
  name: string;
  type: 'org' | 'node' | 'custom';
  did?: string;
  description?: string;
  namespace?: string;
  created?: string;
  updated?: string;
  parent?: string;
  messages?: {
    claim?: string;
    update?: string;
    verification?: string;
  };
}

export interface FireflyPin {
  hash: string;
 batch?: string;
  created?: string;
  dispatched?: boolean;
  index?: number;
  masked?: boolean;
  sequence?: number;
  parent?: string;
}

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

  async getIdentities(namespace = 'default') {
    const response = await this.client.get(`/api/v1/namespaces/${namespace}/identities`);
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

  async getNetworkChannels(namespace = 'default') {
    // The provided FireFly OpenAPI spec does not expose a namespace channel listing endpoint.
    // Keep this endpoint safe by returning an empty items list instead of failing backend requests.
    return { items: [] };
  }
}

@Module({
  providers: [FireflyService],
  exports: [FireflyService],
})
export class FireflyModule {}