import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+992901234567' })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  @Matches(/^[+\d\s\-()]+$/, {
    message: 'Phone number must contain only digits, +, -, spaces, or parentheses',
  })
  phone: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @ApiPropertyOptional({ enum: ['USER', 'SELLER'], default: 'USER' })
  @IsOptional()
  @IsIn(['USER', 'SELLER'])
  accountType?: 'USER' | 'SELLER';
}
