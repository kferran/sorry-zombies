/** A small label the Overlay draws above something in the host scene's world (e.g. a hell-cat's name). */
export type NameTag = { id: number; text: string; x: number; y: number };

/** A host scene that has name tags to show; the Overlay asks it every frame. */
export type NameTagHost = { nameTags(): NameTag[] };

export function hasNameTags(scene: unknown): scene is NameTagHost {
  return typeof (scene as Partial<NameTagHost> | undefined)?.nameTags === 'function';
}
