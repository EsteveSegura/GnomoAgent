export const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

export const ROLE_COLOR = {
  system: COLOR.gray,
  user: COLOR.cyan,
  assistant: COLOR.magenta,
  tool: COLOR.yellow,
};

export function indent(str, prefix = '    ') {
  return String(str)
    .split('\n')
    .map((l) => prefix + l)
    .join('\n');
}

export function printMessage(msg, i) {
  const color = ROLE_COLOR[msg.role] ?? COLOR.reset;
  console.log(`\n${color}${COLOR.bold}[#${i}] ${msg.role.toUpperCase()}${COLOR.reset}`);

  if (msg.content) console.log(indent(msg.content));

  if (msg.toolCalls?.length) {
    for (const tc of msg.toolCalls) {
      console.log(
        `${COLOR.dim}    ↳ tool_call${COLOR.reset} ` +
          `${COLOR.bold}${tc.name}${COLOR.reset}` +
          `${COLOR.dim}(${JSON.stringify(tc.args)})  id=${tc.id}${COLOR.reset}`,
      );
    }
  }

  if (msg.role === 'tool') {
    console.log(
      `${COLOR.dim}    toolCallId=${msg.toolCallId}` +
        (msg.name ? ` name=${msg.name}` : '') +
        `${COLOR.reset}`,
    );
  }
}

export function printSeparator(label) {
  const line = '─'.repeat(60);
  console.log(`\n${COLOR.blue}${line}${COLOR.reset}`);
  if (label) console.log(`${COLOR.blue}${COLOR.bold}  ${label}${COLOR.reset}`);
  console.log(`${COLOR.blue}${line}${COLOR.reset}`);
}
