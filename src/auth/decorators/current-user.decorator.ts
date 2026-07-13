import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayloadDto;
  },
);