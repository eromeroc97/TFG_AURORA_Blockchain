import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TelemetryDocument = Telemetry & Document;

@Schema({ collection: 'telemetry_events', timestamps: false, versionKey: false })
export class TelemetryMetadata {
  @Prop()
  telemetryId: string;

  @Prop()
  ecosystemId: string;

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;

  @Prop()
  anchorStatus: string;

  @Prop()
  signature: string | null;

  @Prop()
  publicKey: string | null;

  @Prop()
  txId: string | null;
}

@Schema({ collection: 'telemetry_events', timestamps: false, versionKey: false })
export class Telemetry {
  @Prop()
  timestamp: Date;

  @Prop({ type: Object })
  metadata: TelemetryMetadata;

  @Prop({ type: Object })
  payload: Record<string, unknown>;

  @Prop()
  hash: string;

  @Prop()
  sizeBytes: number;
}

export const TelemetrySchema = SchemaFactory.createForClass(Telemetry);