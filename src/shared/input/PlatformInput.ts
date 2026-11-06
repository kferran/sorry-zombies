/** Side-scroller controls. The three `*Pressed` methods are edge-triggered queues: true once per press. */
export interface PlatformInput {
  /** -1 (left) .. 1 (right). */
  moveX(): number;
  jumpPressed(): boolean;
  whipPressed(): boolean;
  bowPressed(): boolean;
  /** Clear queued presses and held keys; called on create, pause and resume. */
  reset(): void;
  destroy(): void;
}
