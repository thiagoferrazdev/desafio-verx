import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { AppException } from '../../shared-kernel/app-exception';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Optional()
    @Inject('API_KEY')
    private readonly apiKey?: string
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const sentKey = request.header('x-api-key');

    if (sentKey !== this.apiKey) {
      throw new AppException('Invalid API key', 401, 'UNAUTHORIZED');
    }

    return true;
  }
}
