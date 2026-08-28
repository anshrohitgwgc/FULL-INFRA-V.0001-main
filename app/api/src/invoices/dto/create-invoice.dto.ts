import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class InvoiceLineDto {
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() service?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() qty?: number;
  @IsOptional() @IsNumber() rateCents?: number;
  @IsOptional() @IsBoolean() rebate?: boolean;
}

export class CreateInvoiceDto {
  @IsOptional() @IsInt() warehouseId?: number;
  @IsOptional() @IsInt() customerId?: number;
  @IsString() @IsNotEmpty() billTo: string;
  @IsOptional() @IsString() shipTo?: string;
  @IsOptional() @IsString() shipVia?: string;
  @IsOptional() @IsString() shipDate?: string;
  @IsString() @IsNotEmpty() date: string;
  @IsOptional() @IsInt() termsDays?: number;
  @IsOptional() @IsString() taxLabel?: string;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsString() payNote?: string;
  @IsObject() company: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];
}
