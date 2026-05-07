import { Controller, Get, Post, Header, Options, UseGuards, Query, Header as NestHeader, Body, Req, ForbiddenException, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FireflyService, FireflyNamespace, FireflyIdentity, FireflyPin } from '../firefly/firefly.service';
import { RegisterChaincodeDto } from './dto/register-chaincode.dto';

interface NetworkNodeResponse {
  id: string;
  name: string;
  type: string;
  did?: string;
}

interface OrganizationResponse {
  id: string;
  name: string;
  description?: string;
}

interface NamespaceResponse {
  name: string;
  description?: string;
}

interface LedgerInfoResponse {
  height: number;
  lastBlockTime: string;
}

function normalizeListResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response
  }

  if (response && typeof response === 'object') {
    const payload = response as { items?: unknown; data?: unknown }
    if (Array.isArray(payload.items)) {
      return payload.items as T[]
    }
    if (Array.isArray(payload.data)) {
      return payload.data as T[]
    }
  }

  return []
}

@Controller('blockchain')
@UseGuards(AuthGuard('jwt'))
export class BlockchainController {
  constructor(private readonly fireflyService: FireflyService) {}

  @Get('namespace-channels')
  async getNamespaceChannels(@Query('namespace') namespace: string) {
    const response = await this.fireflyService.getNetworkChannels(namespace);
    return response;
  }

  @NestHeader('Access-Control-Allow-Origin', '*')
  @NestHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  @NestHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization')
  @Options()
  optionsBlockchain() {
    return '';
  }

  @Get('network/nodes')
  async getNetworkNodes(@Query('namespace') namespace = 'default') {
    const response = await this.fireflyService.getNetworkNodes(namespace);
    const items = normalizeListResponse<FireflyIdentity>(response).filter(i => i.type === 'node');
    
    return {
      items: items.map((node): NetworkNodeResponse => ({
        id: node.id ?? '',
        name: node.name ?? '',
        type: node.type ?? 'node',
        did: node.did,
      })),
    };
  }

  @Get('network/organizations')
  async getOrganizations(@Query('namespace') namespace = 'default') {
    const response = await this.fireflyService.getOrganizations(namespace);
    const items = normalizeListResponse<FireflyIdentity>(response).filter(i => i.type === 'org');
    
    return {
      items: items.map((org): OrganizationResponse => ({
        id: org.id ?? '',
        name: org.name ?? '',
        description: org.description,
      })),
    };
  }

  @Get('namespaces')
  async getNamespaces() {
    const response = await this.fireflyService.getNamespaces();
    const items = normalizeListResponse<FireflyNamespace>(response);
    
    return {
      items: items.map((ns): NamespaceResponse => ({
        name: ns.name ?? '',
        description: ns.description,
      })),
    };
  }

  @Get('blocks')
  async getBlocks(
    @Query('namespace') namespace = 'default',
    @Query('limit') limit = '10',
    @Query('skip') skip = '0',
  ) {
    const response = await this.fireflyService.getPins(namespace, {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });
    const items = response as FireflyPin[];
    
    return items.map((pin): {
      blockNumber: number;
      blockHash: string;
      previousBlockHash: string;
      dataHash: string;
      transactionCount: number;
      createdAt: string;
    } => ({
      blockNumber: pin.sequence ?? 0,
      blockHash: pin.hash ?? '',
      previousBlockHash: pin.parent ?? '',
      dataHash: pin.hash ?? '',
      transactionCount: 0,
      createdAt: pin.created ?? new Date().toISOString(),
    }));
  }

  @Get('events')
  async getEvents(
    @Query('namespace') namespace = 'default',
    @Query('limit') limit: string | undefined,
    @Query('skip') skip = '0',
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined
    const response = await this.fireflyService.getBlockchainEvents(namespace, {
      limit: parsedLimit,
      skip: parseInt(skip, 10),
    });
    const items = normalizeListResponse<Record<string, unknown>>(response);

    return { items };
  }

  @Get('contracts')
  async getContracts() {
    const response = await this.fireflyService.getContracts();
    return response;
  }

  @Get('health')
  async getHealth() {
    return {
      status: 'UP',
      service: 'blockchain-manager',
    };
  }

  @Get('ledger/info')
  async getLedgerInfo(@Query('namespace') namespace = 'default') {
    const response = await this.fireflyService.getPins(namespace, { limit: 1, skip: 0 });
    const pins = normalizeListResponse<FireflyPin>(response);
    const pin = pins[0];
    
    return {
      height: pin?.sequence ?? 0,
      lastBlockTime: pin?.created ?? new Date().toISOString(),
    } as LedgerInfoResponse;
  }

  @Post('register-chaincode')
  async registerChaincode(@Body() dto: RegisterChaincodeDto, @Req() req: Request & { user: { role: string } }) {
    if (req.user?.role !== 'GLOBAL_ADMIN') {
      throw new ForbiddenException('Only GLOBAL_ADMIN can register chaincodes');
    }

    const namespace = 'default';
    let ffiId: string;

    const parsedFfi = JSON.parse(dto.ffiJson);

    const ffiResponse = await this.fireflyService.registerContractInterface(namespace, parsedFfi);
    ffiId = ffiResponse.id;

    await this.fireflyService.registerApi(namespace, {
      name: dto.apiName,
      interface: { id: ffiId },
      location: {
        channel: dto.channel,
        chaincode: dto.chaincodeName,
      },
    });

    await this.fireflyService.registerEventListener(namespace, {
      name: 'escuchar-telemetria-anclada',
      topic: 'auditoria-iot',
      location: {
        channel: dto.channel,
        chaincode: dto.chaincodeName,
      },
      event: {
        name: 'TelemetryAnchored',
      },
    });

    return {
      success: true,
      message: 'Chaincode registrado correctamente',
      ffiId,
    };
  }

  @Get('contracts/interface')
  async getContractInterface(@Query('name') name: string) {
    const response = await this.fireflyService.getContractInterface(name);
    return response;
  }
}