import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { EntryType } from '../../../domain/entry-type.enum';

export class CreateEntryRequest {
  @IsString()
  @IsNotEmpty()
  merchantId!: string;

  @IsEnum(EntryType)
  type!: EntryType;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsDateString()
  occurredAt!: string;

  @IsString()
  @IsNotEmpty()
  requestId!: string;
}
