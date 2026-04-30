import { DeviceCategory } from '@prisma/client';

export class Device {
  id!: string;
  ecosystemId!: string;
  name!: string;
  category?: DeviceCategory | null;
  room?: string | null;
  macAddress?: string;
  vendor?: string;
  createdAt!: Date;
  updatedAt!: Date;
}