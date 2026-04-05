/**
 * 仓库根下 claudecode/ 目录引用路径（与 HydroDesk 谱系文档一致）。
 * 用于文档链接、后续「打开参考实现」类工具；路径均相对 workspace root。
 * @see HydroDesk/docs/claudecode-lineage-and-agent-stack.md
 */

export const CLAUDECODE_DIR = 'claudecode';

/** source map 还原的 Claude Code 前端/CLI 源码树（研究用） */
export const CLAUDECODE_SOURCEMAP_SRC = 'claudecode/claude-code-sourcemap/restored-src/src';

/** Anthropic 官方开源插件与命令示例 */
export const CLAUDECODE_OFFICIAL_ROOT = 'claudecode/claude-code-official';

export const CLAUDECODE_OFFICIAL_PLUGINS = 'claudecode/claude-code-official/plugins';

/** Claw / harness 参考（含 Rust workspace 说明） */
export const CLAW_CODE_ROOT = 'claudecode/claw-code';

/** 本地构建后 Tauri `probe_hydrodesk_agent_backend` 探测路径与此一致 */
export const CLAW_BINARY_RELEASE_REL = 'claudecode/claw-code/rust/target/release/claw';

export const CLAW_BINARY_DEBUG_REL = 'claudecode/claw-code/rust/target/debug/claw';

export function getClaudecodeLineageDocRelPath() {
  return 'HydroDesk/docs/claudecode-lineage-and-agent-stack.md';
}
