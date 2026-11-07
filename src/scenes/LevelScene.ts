import Phaser from 'phaser';
import { bus } from '../shared/events';
import type { LevelData } from '../features/levels/LevelLoader';
import { STAGES } from './run/stages';
import { overlaps } from './level/HeroCombat';
import { StageScene, type StageInit } from './StageScene';

export type LevelInit = StageInit;

/** Touch zones at the exit and the lantern: this wide and tall, standing on the marker. */
const ZONE = { width: 16, height: 40 } as const;
type Box = { left: number; right: number; top: number; bottom: number };

/** A level: the shared stage (StageScene) plus its exit gate and checkpoint lantern. */
export class LevelScene extends StageScene {
  private exitZone?: Box;
  private checkpointZone?: Box;
  private lantern?: Phaser.GameObjects.Image;
  private lanternGlow?: Phaser.GameObjects.Image;

  constructor() { super('Level'); }

  init(data: LevelInit): void {
    this.initStage(data);
    this.exitZone = undefined;
    this.checkpointZone = undefined;
    this.lantern = undefined;
    this.lanternGlow = undefined;
  }

  /** Is the checkpoint lantern lit? (Play checks.) */
  get lanternLit(): boolean {
    return this.run.checkpointLit;
  }

  protected override addProps(level: LevelData): void {
    this.addExit(level.exit);
    this.addLantern(level.checkpoint);
  }

  /** From the lantern if it's lit. */
  protected override heroStart(level: LevelData): { x: number; y: number } {
    return this.run.checkpointLit && level.checkpoint ? level.checkpoint : level.heroStart;
  }

  protected override checkZones(body: Phaser.Physics.Arcade.Body): void {
    if (!this.run.checkpointLit && this.checkpointZone && overlaps(body, this.checkpointZone)) this.lightLantern();
  }

  protected override atExit(body: Phaser.Physics.Arcade.Body): boolean {
    return this.exitZone !== undefined && overlaps(body, this.exitZone);
  }

  protected override onClear(): void {
    this.run.clearStage();
    bus.emit('stageCleared', { stage: this.stageIndex });
    this.scene.start('LevelCard', { run: this.run, stage: this.stageIndex });
  }

  /** Same stage again, from the lantern if lit (the debug map override carries over). */
  protected override retryData(): LevelInit {
    const data: LevelInit = { run: this.run, stageIndex: this.stageIndex };
    if (this.mapKey !== STAGES[this.stageIndex].key) data.mapKey = this.mapKey;
    return data;
  }

  private addExit(exit: LevelData['exit']): void {
    if (!exit) return;
    this.add.image(exit.x, exit.y, 'exit-gate').setOrigin(0.5, 1).setDepth(2);
    this.exitZone = standingBox(exit);
  }

  private addLantern(at: LevelData['checkpoint']): void {
    if (!at) return;
    this.lanternGlow = this.add.image(at.x, at.y - 24, 'lantern-glow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setVisible(false);
    this.lantern = this.add.image(at.x, at.y, 'lantern-unlit').setOrigin(0.5, 1).setDepth(4);
    this.checkpointZone = standingBox(at);
    if (this.run.checkpointLit) this.showLit();
  }

  private lightLantern(): void {
    this.run.checkpointLit = true;
    this.showLit();
  }

  private showLit(): void {
    this.lantern?.setTexture('lantern-lit');
    const glow = this.lanternGlow;
    if (!glow) return;
    glow.setVisible(true);
    this.tweens.add({ targets: glow, alpha: { from: 1, to: 0.6 }, duration: 700, yoyo: true, repeat: -1 });
  }
}

/** A ZONE-sized box standing on a map marker (x centre, y the surface under it). */
function standingBox(at: { x: number; y: number }): Box {
  return { left: at.x - ZONE.width / 2, right: at.x + ZONE.width / 2, top: at.y - ZONE.height, bottom: at.y };
}
