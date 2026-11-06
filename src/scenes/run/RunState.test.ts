import { describe, it, expect } from 'vitest';
import { RunState, decideFrame } from './RunState';
import { MODES } from '../../shared/modes';

describe('RunState', () => {
  it('first stage starts with 3', () => {
    const run = new RunState(MODES.casual);
    run.hearts = 1;
    run.startStage(0);
    expect(run.hearts).toBe(3);
    expect(run.stageIndex).toBe(0);
  });

  it('startStage restores one heart up to 3', () => {
    const run = new RunState(MODES.casual);
    run.startStage(0);
    run.hearts = 1;
    run.startStage(1);
    expect(run.hearts).toBe(2);
    run.startStage(2);
    expect(run.hearts).toBe(3);
    run.startStage(3);
    expect(run.hearts).toBe(3);
    expect(run.stageIndex).toBe(3);
  });

  it('startStage puts the checkpoint out', () => {
    const run = new RunState(MODES.casual);
    run.startStage(0);
    run.checkpointLit = true;
    run.startStage(1);
    expect(run.checkpointLit).toBe(false);
  });

  it('retry resets hearts to 3, counts a try, keeps guilt, stats and the lit checkpoint', () => {
    const run = new RunState(MODES.conscience);
    run.startStage(1);
    run.guilt.onKill(7);
    run.stats.enemiesHurt = 5;
    run.stats.enemiesPutDown = 2;
    run.stats.sampleGuilt(40, true);
    run.checkpointLit = true;
    run.hearts = 0;
    const guilt = run.guilt;
    run.retry();
    expect(run.hearts).toBe(3);
    expect(run.stats.tries).toBe(2);
    expect(run.guilt).toBe(guilt);
    expect(run.guilt.value).toBe(10);
    expect([run.stats.enemiesHurt, run.stats.enemiesPutDown, run.stats.averageGuilt()]).toEqual([5, 2, 40]);
    expect(run.checkpointLit).toBe(true);
    expect(run.stageIndex).toBe(1);
  });

  it('clearStage counts a cleared stage', () => {
    const run = new RunState(MODES.casual);
    run.startStage(0);
    run.clearStage();
    expect(run.stats.stagesCleared).toBe(1);
  });

  it('stageTally counts only what happened since the stage started', () => {
    const run = new RunState(MODES.casual);
    run.startStage(0);
    run.stats.enemiesHurt = 4;
    run.stats.enemiesPutDown = 2;
    run.stats.apologies = 1;
    run.startStage(1);
    run.stats.enemiesHurt += 3;
    run.stats.enemiesPutDown += 1;
    run.retry(); // a retry stays inside the stage
    run.stats.enemiesHurt += 2;
    expect(run.stageTally()).toEqual({ enemiesHurt: 5, enemiesPutDown: 1, apologies: 0 });
  });

  it('guilt follows the mode', () => {
    expect(new RunState(MODES.casual).guilt.onKill(1)).toEqual({ breakdown: false });
    const run = new RunState(MODES.casual);
    run.guilt.onKill(1);
    expect(run.guilt.value).toBe(0);
    const c = new RunState(MODES.conscience);
    c.guilt.onKill(1);
    expect(c.guilt.value).toBe(10);
  });
});

describe('decideFrame', () => {
  it('hearts gone beats reaching the exit', () => {
    expect(decideFrame(0, true)).toBe('retry');
    expect(decideFrame(-1, true)).toBe('retry');
  });

  it('exit with hearts clears', () => {
    expect(decideFrame(1, true)).toBe('clear');
    expect(decideFrame(3, true)).toBe('clear');
  });

  it('hearts gone away from the exit retries', () => {
    expect(decideFrame(0, false)).toBe('retry');
  });

  it('otherwise the stage goes on', () => {
    expect(decideFrame(2, false)).toBe('continue');
  });
});
