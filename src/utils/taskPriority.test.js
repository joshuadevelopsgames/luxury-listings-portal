import { normalizeTaskPriorityToInt, taskPriorityToLabel } from './taskPriority';

// Characterization tests: lock the priority int<->label mapping that feeds
// Postgres (tasks.priority is INT 1-4). This is exactly the type-coercion
// class of bug that has bitten task writes before.

describe('normalizeTaskPriorityToInt', () => {
  it('falls back to 2 (medium) for empty/nullish input', () => {
    expect(normalizeTaskPriorityToInt(null)).toBe(2);
    expect(normalizeTaskPriorityToInt(undefined)).toBe(2);
    expect(normalizeTaskPriorityToInt('')).toBe(2);
  });

  it('honors a custom fallback', () => {
    expect(normalizeTaskPriorityToInt(null, 1)).toBe(1);
  });

  it('passes through valid in-range integers (rounding floats)', () => {
    expect(normalizeTaskPriorityToInt(1)).toBe(1);
    expect(normalizeTaskPriorityToInt(4)).toBe(4);
    expect(normalizeTaskPriorityToInt(2.4)).toBe(2);
  });

  it('rejects out-of-range numbers to the fallback', () => {
    expect(normalizeTaskPriorityToInt(0)).toBe(2);
    expect(normalizeTaskPriorityToInt(5)).toBe(2);
  });

  it('maps text labels to ints', () => {
    expect(normalizeTaskPriorityToInt('low')).toBe(1);
    expect(normalizeTaskPriorityToInt('medium')).toBe(2);
    expect(normalizeTaskPriorityToInt('normal')).toBe(2);
    expect(normalizeTaskPriorityToInt('high')).toBe(3);
    expect(normalizeTaskPriorityToInt('urgent')).toBe(4);
    expect(normalizeTaskPriorityToInt('critical')).toBe(4);
  });

  it('maps p1..p4 labels (p1 = highest = 4)', () => {
    expect(normalizeTaskPriorityToInt('p1')).toBe(4);
    expect(normalizeTaskPriorityToInt('p4')).toBe(1);
  });

  it('parses numeric strings and is case/space-insensitive', () => {
    expect(normalizeTaskPriorityToInt('3')).toBe(3);
    expect(normalizeTaskPriorityToInt('  HIGH ')).toBe(3);
  });

  it('falls back on unrecognized text', () => {
    expect(normalizeTaskPriorityToInt('banana')).toBe(2);
  });
});

describe('taskPriorityToLabel', () => {
  it('defaults to medium for empty input', () => {
    expect(taskPriorityToLabel(null)).toBe('medium');
    expect(taskPriorityToLabel('')).toBe('medium');
  });

  it('maps ints to labels with saturation at the ends', () => {
    expect(taskPriorityToLabel(0)).toBe('low');
    expect(taskPriorityToLabel(1)).toBe('low');
    expect(taskPriorityToLabel(2)).toBe('medium');
    expect(taskPriorityToLabel(3)).toBe('high');
    expect(taskPriorityToLabel(4)).toBe('urgent');
    expect(taskPriorityToLabel(9)).toBe('urgent');
  });

  it('normalizes legacy string aliases', () => {
    expect(taskPriorityToLabel('normal')).toBe('medium');
    expect(taskPriorityToLabel('critical')).toBe('urgent');
    expect(taskPriorityToLabel('p1')).toBe('urgent');
    expect(taskPriorityToLabel('3')).toBe('high');
  });

  it('round-trips canonical labels', () => {
    ['low', 'medium', 'high', 'urgent'].forEach((label) => {
      expect(taskPriorityToLabel(label)).toBe(label);
      expect(taskPriorityToLabel(normalizeTaskPriorityToInt(label))).toBe(label);
    });
  });
});
