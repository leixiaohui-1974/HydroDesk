export function getModeMeta(mode) {
  if (mode === 'development') {
    return {
      label: '开发模式',
      summary: '开放 IDE、扩展中心、调试与插件开发能力',
      audience: '开发者工作面',
      className: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
      dotClassName: 'bg-hydro-400',
    };
  }
  return {
    label: '发布模式',
    summary: '聚焦角色工作面、成果阅读与业务操作',
    audience: '业务用户工作面',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dotClassName: 'bg-emerald-400',
  };
}

export function getRuntimeEnvironmentMeta(isTauri) {
  return isTauri
    ? {
        label: '桌面壳',
        summary: '具备 Tauri 文件、命令、窗口与本地执行能力',
        className: 'border-slate-700/50 bg-slate-800/60 text-slate-300',
      }
    : {
        label: '浏览器预览',
        summary: '仅预览产品壳与只读能力；文件与命令动作降级',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      };
}
