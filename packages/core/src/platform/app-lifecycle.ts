export type LifecycleState = "foreground" | "background";

export type LifecycleListener = (state: LifecycleState) => void;

export interface AppLifecycle {
  getState(): LifecycleState;
  subscribe(listener: LifecycleListener): () => void;
}
