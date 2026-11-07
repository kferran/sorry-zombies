// Pure: a catKill line that names the cat. No Phaser imports.

const TOKEN = /\{name\}/g;

/** Fills in `{name}`; a line without it gets "Sorry, <name>. " in front. */
export function nameCatLine(line: string, name: string): string {
  if (line.includes('{name}')) return line.replace(TOKEN, name);
  return `Sorry, ${name}. ${line}`;
}
