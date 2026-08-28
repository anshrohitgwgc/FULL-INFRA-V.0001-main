import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsInt() warehouseId: number;
  @IsInt() materialId: number;
  @IsIn(['inbound', 'outbound', 'adjustment']) type: 'inbound' | 'outbound' | 'adjustment';
  @IsNumber() qty: number;
  @IsOptional() qtyBySize?: Record<string, number>;
  @IsOptional() @IsNumber() gross?: number;
  @IsOptional() @IsNumber() tare?: number;
  @IsOptional() @IsString() ref?: string;
  @IsNotEmpty() @IsString() date: string;
  @IsOptional() @IsIn(['recycling', 'healthcare']) entity?: string;
}
