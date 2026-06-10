import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAttributeDto {
  @IsString() code: string;
  @IsString() label: string;
  @IsString() inputType: string; // text|number|list|boolean|date
  @IsOptional() @IsString() source?: string; // FREE|OPTION|MASTER
  @IsOptional() @IsString() masterId?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsArray() options?: string[];
}

export class UpdateAttributeDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() masterId?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsArray() options?: string[];
}
