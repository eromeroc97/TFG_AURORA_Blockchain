export class Device {
  id!: string;
  ecosystemId!: string;
  name!: string;
  fingerprint!: string;
  macAddress?: string;
  vendor?: string;
  status!: string;
  did?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}