import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class TakedownIntakeDto {
  @IsEmail()
  claimant_email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;

  @IsOptional()
  @IsUUID()
  work_id?: string;

  @IsOptional()
  @IsUUID()
  edition_id?: string;
}

