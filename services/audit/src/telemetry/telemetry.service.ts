import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Telemetry, TelemetryDocument } from './telemetry.schema';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectModel(Telemetry.name)
    private readonly telemetryModel: Model<TelemetryDocument>,
  ) {}

  private stableSortObject(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.stableSortObject(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
          acc[key] = this.stableSortObject(nestedValue);
          return acc;
        }, {});
    }

    return value;
  }

  private calculateHash(payload: Record<string, unknown>, latitude: number, longitude: number): string {
    const normalizedPayload = this.stableSortObject(payload);
    const dataToHash = JSON.stringify({
      payload: normalizedPayload,
      gps: { latitude, longitude },
    });
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  async findByIngestId(ingestId: string): Promise<TelemetryDocument | null> {
    return this.telemetryModel.findOne({ 'metadata.telemetryId': ingestId }).exec();
  }

  async verifyIntegrity(telemetryHashFromBlockchain: string, ingestId: string): Promise<boolean> {
    const telemetry = await this.findByIngestId(ingestId);

    if (!telemetry) {
      return false;
    }

    const recalculatedHash = this.calculateHash(
      telemetry.payload as Record<string, unknown>,
      telemetry.metadata.latitude,
      telemetry.metadata.longitude,
    );

    return recalculatedHash === telemetryHashFromBlockchain;
  }
}