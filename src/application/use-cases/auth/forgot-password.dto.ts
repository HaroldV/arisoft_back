import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email de la cuenta del usuario para recuperar el acceso',
    example: 'juan@empresa.com',
  })
  @IsEmail()
  email: string;
}
