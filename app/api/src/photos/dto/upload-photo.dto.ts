import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadPhotoDto {
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsIn(['recycling', 'healthcare']) entity?: string;
  @IsOptional() @IsString() caption?: string;
}
