export type NetworkState = "online" | "offline";

export type NetworkListener = (state: NetworkState) => void;

export interface NetworkStatus {
  getState(): NetworkState;
  subscribe(listener: NetworkListener): () => void;
}
