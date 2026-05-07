import { IsOptional, IsNumber, IsString, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class TimelineFiltersDto {
  @IsOptional()
  @IsString()
  ecosystemId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn(['TELEMETRY', 'ADMIN'])
  eventType?: 'TELEMETRY' | 'ADMIN';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset: number = 0;
}
