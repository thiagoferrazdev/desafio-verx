import { Inject, Injectable } from '@nestjs/common';
import { EntryRepositoryPort } from '../ports/entry-repository.port';

@Injectable()
export class ListEntriesUseCase {
  constructor(
    @Inject('EntryRepositoryPort')
    private readonly entryRepository: EntryRepositoryPort
  ) {}

  execute(merchantId?: string) {
    return this.entryRepository.listByMerchant(merchantId);
  }
}
