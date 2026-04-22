export class Device {
  id!: string;
  ecosystemId!: string;
  name!: string;
  macAddress?: string;
  vendor?: string;
  createdAt!: Date;
  updatedAt!: Date;
}