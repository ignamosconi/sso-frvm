import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto.js';

interface RequestWithUser {
  user: JwtPayloadDto;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadDto => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);