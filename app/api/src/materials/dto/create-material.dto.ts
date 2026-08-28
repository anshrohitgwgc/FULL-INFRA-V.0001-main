import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsIn(['recycling', 'healthcare']) entity?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsIn(['simple', 'weighed', 'sized']) capture?: string;
  @IsOptional() @IsArray() sizes?: string[];
}
