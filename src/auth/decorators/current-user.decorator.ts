import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserInfoOauthDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserInfoOauthDto;
  },
);