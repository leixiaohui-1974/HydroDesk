import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 仓库根（HydroDesk 的上一级），供 Node 侧契约存在性断言 */
export const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
