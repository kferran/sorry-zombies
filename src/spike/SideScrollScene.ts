/**
 * SPIKE — throwaway. Answers one question: do the apologies land better in a
 * Castlevania-style side-scroller than in the arena? Not part of the spec or plan.
 */
import Phaser from 'phaser';
import { ApologyPicker } from '../features/apologies/ApologyPicker';
import { LINES } from '../features/apologies/lines';
import { SpeechBubble } from '../features/apologies/SpeechBubble';
import { ZombieHealth } from '../entities/zombie/ZombieHealth';

const WORLD_W = 3840;
const H = 720;
const GROUND_Y = 640;
const GRAVITY = 1400;
const HERO = { speed: 220, jump: 620, hearts: 3, swingCooldownMs: 420, invulnMs: 1000 };
const ZOMBIE = { speed: 55, wakeDistance: 650, hits: 3 };
const HIT_STOP_MS = 90;
/** Zombie spawn x positions; each escalates the apology tier a little. */
const ZOMBIE_XS = [900, 1450, 1820, 2400, 2850, 3300];

type Walker = Phaser.Physics.Arcade.Sprite & {
  health: ZombieHealth;
  index: number;
  waitUntil: number;
  awake: boolean;
};

export class SideScrollScene extends Phaser.Scene {
  private hero!: Phaser.Physics.Arcade.Sprite;
  private zombies!: Phaser.Physics.Arcade.Group;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private picker = new ApologyPicker(LINES);
  private bubble!: SpeechBubble;
  private facing = 1;
  private lastSwing = -Infinity;
  private invulnUntil = 0;
  private hearts = HERO.hearts;
  private heartsText!: Phaser.GameObjects.Text;
  private over = false;

  constructor() { super('SideScroll'); }

  create(): void {
    this.over = false;
    this.hearts = HERO.hearts;
    this.picker = new ApologyPicker(LINES);
    this.makeTextures();
    this.physics.world.setBounds(0, 0, WORLD_W, H);
    this.physics.world.gravity.y = GRAVITY;
    this.cameras.main.setBounds(0, 0, WORLD_W, H).setBackgroundColor('#20232a');

    // Distant "windows" so scrolling reads as movement.
    for (let x = 100; x < WORLD_W; x += 260) {
      this.add.rectangle(x, 260 + (x % 3) * 40, 70, 110, 0x2f3542).setScrollFactor(0.5);
    }

    this.platforms = this.physics.add.staticGroup();
    this.platforms.add(this.add.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W, 80, 0x4b5563));
    this.platforms.add(this.add.rectangle(1820, 520, 320, 24, 0x6b7280));

    this.hero = this.physics.add.sprite(150, GROUND_Y - 40, 'ss-hero').setCollideWorldBounds(true);
    this.physics.add.collider(this.hero, this.platforms);
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);

    this.zombies = this.physics.add.group();
    ZOMBIE_XS.forEach((x, i) => {
      const y = x === 1820 ? 460 : GROUND_Y - 40;
      const z = this.zombies.create(x, y, 'ss-zombie') as Walker;
      z.health = new ZombieHealth(ZOMBIE.hits);
      z.index = i;
      z.waitUntil = 0;
      z.awake = false;
      z.setFlipX(true);
    });
    this.physics.add.collider(this.zombies, this.platforms);
    this.physics.add.overlap(this.hero, this.zombies, (_h, z) => this.zombieTouches(z as Walker));

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), a: kb.addKey(K.A), d: kb.addKey(K.D),
      up: kb.addKey(K.UP), w: kb.addKey(K.W), space: kb.addKey(K.SPACE), j: kb.addKey(K.J),
      esc: kb.addKey(K.ESC),
    };
    this.input.on('pointerdown', () => this.swing());

    this.bubble = new SpeechBubble(this);
    this.heartsText = this.add.text(20, 16, '', { fontFamily: 'monospace', fontSize: '24px', color: '#ef4444' }).setScrollFactor(0);
    this.add.text(this.scale.width - 20, 16, 'SPIKE · ←/→ walk · W jump · J or click swat · Esc menu', {
      fontFamily: 'monospace', fontSize: '16px', color: '#9ca3af',
    }).setOrigin(1, 0).setScrollFactor(0);
    this.drawHearts();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.bubble.destroy());
  }

  private makeTextures(): void {
    if (this.textures.exists('ss-hero')) return;
    const g = this.add.graphics();
    g.fillStyle(0x3b82f6).fillRect(0, 0, 32, 64).fillStyle(0xfde68a).fillRect(8, 6, 16, 14)
      .generateTexture('ss-hero', 32, 64);
    g.clear().fillStyle(0x16a34a).fillRect(0, 0, 32, 64).fillStyle(0x86efac).fillRect(4, 6, 16, 14)
      .fillStyle(0x16a34a).fillRect(-6, 26, 14, 8)
      .generateTexture('ss-zombie', 32, 64);
    g.clear().fillStyle(0xf5f5f4).fillRect(0, 0, 56, 14).fillStyle(0x9ca3af).fillRect(4, 4, 48, 2).fillRect(4, 8, 40, 2)
      .generateTexture('ss-paper', 56, 14);
    g.destroy();
  }

  update(): void {
    if (this.over) return;
    const now = this.time.now;
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.esc)) { this.scene.start('Menu'); return; }

    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    const dir = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    body.setVelocityX(dir * HERO.speed);
    if (dir !== 0) { this.facing = dir; this.hero.setFlipX(dir < 0); }
    const jump = Phaser.Input.Keyboard.JustDown(k.up) || Phaser.Input.Keyboard.JustDown(k.w) || Phaser.Input.Keyboard.JustDown(k.space);
    if (jump && body.blocked.down) body.setVelocityY(-HERO.jump);
    if (Phaser.Input.Keyboard.JustDown(k.j)) this.swing();

    this.zombies.getChildren().forEach(o => {
      const z = o as Walker;
      if (!z.active || z.health.dead) return;
      const dx = this.hero.x - z.x;
      if (!z.awake && Math.abs(dx) < ZOMBIE.wakeDistance) z.awake = true;
      const zb = z.body as Phaser.Physics.Arcade.Body;
      // A hit zombie waits until the apology has been said, then shuffles back in.
      if (!z.awake || now < z.waitUntil) {
        if (zb.blocked.down) zb.setVelocityX(zb.velocity.x * 0.9);
        return;
      }
      zb.setVelocityX(Math.sign(dx) * ZOMBIE.speed);
      z.setFlipX(dx < 0);
    });

    const alive = this.zombies.getChildren().filter(o => !(o as Walker).health.dead).length;
    if (alive === 0 && this.hero.x > WORLD_W - 200) this.finish('Level clear. Everyone is very sorry.');
  }

  private swing(): void {
    const now = this.time.now;
    if (this.over || now - this.lastSwing < HERO.swingCooldownMs) return;
    this.lastSwing = now;
    const x = this.hero.x + this.facing * 44;
    const paper = this.add.image(x, this.hero.y - 6, 'ss-paper').setFlipX(this.facing < 0);
    this.tweens.add({ targets: paper, angle: this.facing * 60, alpha: 0, duration: 140, onComplete: () => paper.destroy() });
    const zone = new Phaser.Geom.Rectangle(x - 34, this.hero.y - 34, 68, 56);
    const hit = this.zombies.getChildren().find(o => {
      const z = o as Walker;
      return z.active && !z.health.dead && Phaser.Geom.Rectangle.Overlaps(zone, z.getBounds());
    }) as Walker | undefined;
    if (hit) this.swat(hit);
  }

  private swat(z: Walker): void {
    const result = z.health.takeHit();
    if (result === 'ignored') return;
    // Wave stand-in: each zombie down the corridor escalates the apology tier.
    const wave = 1 + Math.round(z.index * 1.8);
    const line = this.picker.pick(result === 'killed' ? 'kill' : 'hit', wave);
    this.bubble.say(line, this.hero);
    const readMs = 1200 + 40 * line.length;

    // Hit-stop: a short freeze sells the impact and gives the line a beat.
    this.physics.pause();
    this.cameras.main.shake(80, 0.004);
    this.time.delayedCall(HIT_STOP_MS, () => { if (!this.over) this.physics.resume(); });

    // Phaser 4: a white flash is a FILL-mode tint.
    z.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(80, () => z.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    const zb = z.body as Phaser.Physics.Arcade.Body;
    zb.setVelocity(Math.sign(z.x - this.hero.x) * 260, -220);
    z.waitUntil = this.time.now + Math.min(readMs, 3200);

    if (result === 'killed') {
      zb.setVelocityX(Math.sign(z.x - this.hero.x) * 120);
      zb.checkCollision.none = false;
      this.tweens.add({ targets: z, angle: Math.sign(z.x - this.hero.x) * 90, alpha: 0.25, duration: 600, delay: 150 });
      this.time.delayedCall(readMs, () => z.disableBody(true, true));
    }
  }

  private zombieTouches(z: Walker): void {
    const now = this.time.now;
    if (this.over || z.health.dead || now < this.invulnUntil || now < z.waitUntil) return;
    this.invulnUntil = now + HERO.invulnMs;
    this.hearts -= 1;
    this.drawHearts();
    (this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(Math.sign(this.hero.x - z.x) * 300, -260);
    z.waitUntil = now + 800;
    this.tweens.add({ targets: this.hero, alpha: 0.2, duration: 100, yoyo: true, repeat: 4, onComplete: () => this.hero.setAlpha(1) });
    if (this.hearts <= 0) this.finish('They got you. Fair, honestly.');
  }

  private drawHearts(): void {
    this.heartsText.setText('♥ '.repeat(Math.max(0, this.hearts)).trim());
  }

  private finish(text: string): void {
    if (this.over) return;
    this.over = true;
    this.physics.pause();
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, `${text}\n\nClick to return to the menu`, {
      fontFamily: 'monospace', fontSize: '32px', color: '#ffffff', align: 'center', backgroundColor: '#000000aa', padding: { x: 24, y: 16 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
    this.time.delayedCall(400, () => this.input.once('pointerdown', () => this.scene.start('Menu')));
  }
}
