import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { retry, delay } from 'rxjs/operators';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../crypto/crypto.service';
import { ActionType } from './action-types.enum';
import { AnchorParams } from './anchoring.interfaces';
import { serializeMetadata } from './action-metadata.utils';

function generateUUID(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

@Injectable()
export class ActionsAnchorService {
  private readonly logger = new Logger(ActionsAnchorService.name);
  private baseUrl!: string;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 3000;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  private getFireFlyBaseUrl(): string {
    if (!this.baseUrl) {
      this.baseUrl = process.env.FIREFLY_API_URL!;
      if (!this.baseUrl) {
        throw new Error('FIREFLY_API_URL is not defined');
      }
    }
    return this.baseUrl;
  }

  private async resolveActorKeys(actorId: string): Promise<{ publicKey: string; privateKey: string }> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        identity: {
          select: {
            publicKey: true,
            privateKeyCiphertext: true,
            privateKeyIv: true,
            privateKeyAuthTag: true,
          },
        },
      },
    });

    if (!actor?.identity) {
      throw new BadRequestException('El usuario actor no tiene identidad criptográfica');
    }

    if (!actor.identity.publicKey || !actor.identity.privateKeyCiphertext || !actor.identity.privateKeyIv || !actor.identity.privateKeyAuthTag) {
      throw new BadRequestException('El usuario actor no tiene claves criptográficas completas');
    }

    const privateKey = this.cryptoService.decryptPrivateKey({
      ciphertext: actor.identity.privateKeyCiphertext,
      iv: actor.identity.privateKeyIv,
      authTag: actor.identity.privateKeyAuthTag,
    });

    return { publicKey: actor.identity.publicKey, privateKey };
  }

  private buildCanonicalPayload(params: {
    actionId: string;
    actionType: ActionType;
    actorId: string;
    targetId: string;
    parentActionId: string;
    nonce: string;
  }): string {
    const canonical: Record<string, string> = {
      action_id: params.actionId,
      action_type: params.actionType,
      actor_id: params.actorId,
      nonce: params.nonce,
      target_id: params.targetId,
    };

    if (params.parentActionId) {
      canonical.parent_action_id = params.parentActionId;
    }

    return JSON.stringify(canonical);
  }

  private computeCanonicalSignature(canonicalJson: string, privateKeyPem: string): string {
    const sha256Hash = this.cryptoService.hashSha256(canonicalJson);
    return this.cryptoService.sign(sha256Hash, privateKeyPem);
  }

  async anchorAction<T extends ActionType>(params: {
    actionId?: string;
    actionType: T;
    actorId: string;
    targetId: string;
    parentActionId?: string;
    readableDescription: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string } | null> {
    const actionId = params.actionId ?? generateUUID();
    const nonce = randomBytes(16).toString('hex');
    const anchoredAt = new Date().toISOString();

    const { publicKey, privateKey } = await this.resolveActorKeys(params.actorId);

    const canonicalJson = this.buildCanonicalPayload({
      actionId,
      actionType: params.actionType,
      actorId: params.actorId,
      targetId: params.targetId,
      parentActionId: params.parentActionId ?? '',
      nonce,
    });

    const signature = this.computeCanonicalSignature(canonicalJson, privateKey);
    const metadataJSON = serializeMetadata(params.actionType, (params.metadata ?? {}) as never);

    const baseUrl = this.getFireFlyBaseUrl();
    const endpoint = `${baseUrl}/apis/aurora-actions-anchor/AnchorAction`;

    try {
      const postRes = await firstValueFrom(
        this.httpService.post(endpoint, null, {
          params: {
            actionID: actionId,
            actorID: params.actorId,
            targetID: params.targetId,
            actionType: params.actionType,
            parentActionID: params.parentActionId ?? '',
            readableDescription: params.readableDescription,
            signature,
            publicKey,
            nonce,
            anchoredAt,
            metadataJSON,
          },
        }).pipe(
          retry({ count: this.maxRetries, delay: this.retryDelayMs }),
        ),
      );

      this.logger.log(`Anchor succeeded: ${actionId}`);
      return { id: actionId };
    } catch (error) {
      const axiosError = error as { message?: string; response?: { data?: unknown } };
      this.logger.error(
        `Anchor failed for actionId=${actionId}: ${axiosError.message ?? 'Unknown error'}`,
        axiosError.response?.data ? JSON.stringify(axiosError.response.data) : undefined,
      );
      return null;
    }
  }
}
