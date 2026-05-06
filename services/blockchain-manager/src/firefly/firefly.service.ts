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

function normalizeFireflyApiUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/$/, '')
  return trimmed.replace(/\/api\/v1$/i, '')
}

@Injectable()
export class FireflyService {
  private readonly client: AxiosInstance;

  constructor() {
    const rawApiUrl = process.env.FIREFLY_API_URL || 'http://firefly:5000';
    const apiUrl = normalizeFireflyApiUrl(rawApiUrl)
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

  async registerContractInterface(namespace: string, ffi: object): Promise<{ id: string }> {
    const response = await this.client.post(
      `/api/v1/namespaces/${namespace}/contracts/interfaces`,
      ffi
    );
    return response.data;
  }

  async registerApi(namespace: string, apiData: object): Promise<{ id: string }> {
    const response = await this.client.post(
      `/api/v1/namespaces/${namespace}/apis`,
      apiData
    );
    return response.data;
  }

  async registerEventListener(namespace: string, listenerData: object): Promise<{ id: string }> {
    const response = await this.client.post(
      `/api/v1/namespaces/${namespace}/contracts/listeners`,
      listenerData
    );
    return response.data;
  }

  async getContractInterface(apiName: string, namespace = 'default'): Promise<any> {
    const response = await this.client.get(
      `/api/v1/namespaces/${namespace}/apis/${apiName}/api/swagger.json`
    );
    return response.data;
  }
}

@Module({
  providers: [FireflyService],
  exports: [FireflyService],
})
export class FireflyModule {}