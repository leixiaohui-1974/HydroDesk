import { useNavigate } from 'react-router-dom';
import { studioAccounts } from '../data/accountCatalog';
import { roleProfiles } from '../data/roleProfiles';
import { getModeMeta } from '../config/shellMeta';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

export default function AccountLogin() {
  const navigate = useNavigate();
  const { activeAccount, loginAsAccount } = useStudioWorkspace();

  return (
    <div className="min-h-screen bg-slate-950 px-8 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="text-xs uppercase tracking-[0.28em] text-slate-500">HydroMind Studio</div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/docs')}
            className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300"
          >
            打开文档中心
          </button>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-100">选择账号工作台</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          账号决定角色、模式与默认工作台。进入工作页后不再直接切角色或切模式；如需切换，请重新选择账号。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.values(studioAccounts).map((account) => {
            const modeMeta = getModeMeta(account.mode);
            const roleLabel = roleProfiles[account.role]?.label || account.role;
            const isActive = activeAccount?.key === account.key;

            return (
              <button
                key={account.key}
                type="button"
                onClick={() => {
                  loginAsAccount(account.key);
                  navigate(account.defaultRoute || '/workbench');
                }}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  isActive
                    ? 'border-hydro-500/30 bg-hydro-500/10'
                    : 'border-slate-700/50 bg-slate-900/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-slate-100">{account.label}</div>
                  {isActive ? (
                    <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                      当前账号
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-xs text-slate-500">{account.userName}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                    {roleLabel}
                  </span>
                  <span className={`rounded-full border px-2 py-1 text-[10px] ${modeMeta.className}`}>
                    {modeMeta.label}
                  </span>
                  <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                    默认页 {account.defaultRoute}
                  </span>
                </div>
                <div className="mt-4 text-sm text-slate-400">{account.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
