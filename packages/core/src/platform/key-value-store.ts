export type KeyValueListener = (key: string) => void;

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  subscribe(listener: KeyValueListener): () => void;
}
