/**
 * Rollout 案例 id 列表：与闭环 YAML case_selection 一致，来源 playwrightRollout.generated.json。
 * 勿手改；变更案例请改 Hydrology/configs/hydrodesk_autonomous_waternet_e2e_loop.yaml 后运行 export_playwright_rollout_registry.py。
 */
import raw from '../src/config/playwrightRollout.generated.json' assert { type: 'json' };

export const ROLLOUT_CASE_IDS = Object.freeze([...raw.case_ids]);
