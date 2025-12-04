export interface Persistence<T> {
  create(data: T): Promise<string | number>;
  read(id: string | number): Promise<T | null>;
  update(id: string | number, data: Partial<T>): Promise<T | null>;
  upsert(data: T): Promise<string | number>;
  delete(id: string | number): Promise<boolean>;
  list(limit?: number, offset?: number): Promise<T[]>;
  count(): Promise<number>;
}
