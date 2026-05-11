import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ActionType } from './action-types.enum';
import { AuroraActionAnchor } from './anchoring.interfaces';

@Injectable()
export class ActionsQueryService {
  private readonly logger = new Logger(ActionsQueryService.name);
  private baseUrl!: string;

  constructor(private readonly httpService: HttpService) {}

  private getFireFlyBaseUrl(): string {
    if (!this.baseUrl) {
      this.baseUrl = process.env.FIREFLY_API_URL!;
      if (!this.baseUrl) {
        throw new Error('FIREFLY_API_URL is not defined');
      }
    }
    return this.baseUrl;
  }

  async getAction(actionId: string): Promise<AuroraActionAnchor | null> {
    try {
      const baseUrl = this.getFireFlyBaseUrl();
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/apis/aurora-actions-anchor/GetAction`, {
          params: { actionID: actionId },
        }),
      );
      return res.data as AuroraActionAnchor;
    } catch (error) {
      this.logger.warn(`GetAction failed for ${actionId}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  async getActionsByActor(actorId: string): Promise<AuroraActionAnchor[]> {
    try {
      const baseUrl = this.getFireFlyBaseUrl();
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/apis/aurora-actions-anchor/GetActionsByActor`, {
          params: { actorID: actorId },
        }),
      );
      return (res.data as AuroraActionAnchor[]) ?? [];
    } catch (error) {
      this.logger.warn(`GetActionsByActor failed for ${actorId}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  async getActionsByActorAndType(actorId: string, actionType: ActionType): Promise<AuroraActionAnchor[]> {
    try {
      const baseUrl = this.getFireFlyBaseUrl();
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/apis/aurora-actions-anchor/GetActionsByActorAndType`, {
          params: { actorID: actorId, actionType },
        }),
      );
      return (res.data as AuroraActionAnchor[]) ?? [];
    } catch (error) {
      this.logger.warn(`GetActionsByActorAndType failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  async getActionsByActorAndTypeAndTarget(
    actorId: string,
    actionType: ActionType,
    targetId: string,
  ): Promise<AuroraActionAnchor[]> {
    try {
      const baseUrl = this.getFireFlyBaseUrl();
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/apis/aurora-actions-anchor/GetActionsByActorAndTypeAndTarget`, {
          params: { actorID: actorId, actionType, targetID: targetId },
        }),
      );
      return (res.data as AuroraActionAnchor[]) ?? [];
    } catch (error) {
      this.logger.warn(`GetActionsByActorAndTypeAndTarget failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  async getActionsByType(actionType: ActionType): Promise<AuroraActionAnchor[]> {
    try {
      const baseUrl = this.getFireFlyBaseUrl();
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/apis/aurora-actions-anchor/GetActionsByType`, {
          params: { actionType },
        }),
      );
      return (res.data as AuroraActionAnchor[]) ?? [];
    } catch (error) {
      this.logger.warn(`GetActionsByType failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  async getActionChildren(parentActionId: string): Promise<AuroraActionAnchor[]> {
    try {
      const baseUrl = this.getFireFlyBaseUrl();
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/apis/aurora-actions-anchor/GetActionChildren`, {
          params: { parentActionID: parentActionId },
        }),
      );
      return (res.data as AuroraActionAnchor[]) ?? [];
    } catch (error) {
      this.logger.warn(`GetActionChildren failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  async findGrantAccessAction(
    actorId: string,
    ecosystemId: string,
    grantedUserId: string,
  ): Promise<AuroraActionAnchor | null> {
    const actions = await this.getActionsByActorAndTypeAndTarget(actorId, ActionType.ECOSYSTEM_ACCESS_GRANT, ecosystemId);
    return actions.find(a => a.metadata?.grantedUserId === grantedUserId) ?? null;
  }
}
