export interface TransactionContext {}

export interface TransactionManagerPort {
  runInTransaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
