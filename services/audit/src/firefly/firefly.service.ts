import { Module, Injectable } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { BlockchainStats, AuditTimelineResponse, ChainVisualization } from '../audit/interfaces';

@Injectable()
export class FireFlyService {
  private readonly baseUrl: string;
  private readonly contractId: string;
  private readonly namespace: string;
  private readonly httpService: HttpService;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.get<string>('FIREFLY_API_URL') || 'http://localhost:5000';
    this.contractId = configService.get<string>('FIREFLY_CONTRACT_ID') || '';
    this.namespace = configService.get<string>('FIREFLY_NAMESPACE') || 'default';
  }

  async queryChaincode<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.contractId) {
      throw new Error('FIREFLY_CONTRACT_ID is not configured');
    }

    const url = `${this.baseUrl}/api/v1/namespaces/${this.namespace}/contracts/${this.contractId}/query/${method}`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(`FireFly query failed: ${error.message}`);
    }
  }

  async getTransactions(params: Record<string, any> = {}): Promise<any> {
    const url = `${this.baseUrl}/api/v1/namespaces/${this.namespace}/transactions`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(`FireFly transactions query failed: ${error.message}`);
    }
  }

  async getOperations(params: Record<string, any> = {}): Promise<any> {
    const url = `${this.baseUrl}/api/v1/namespaces/${this.namespace}/operations`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(`FireFly operations query failed: ${error.message}`);
    }
  }
}
