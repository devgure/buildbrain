import { IsNotEmpty, IsString, IsNumber, IsOptional, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBidDto {
  @IsMongoId()
  @IsNotEmpty()
  projectId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
