// ============================================================
// Renders a real Instagram report through a report template
// (theme + section blocks) using the builder's ReportCanvas.
//
// Template resolution order:
//   1. explicit `template` prop (e.g. the one selected in the wizard)
//   2. report.template snapshot saved on the report
//   3. the client's default template (authenticated viewers only)
//   4. the built-in "Classic" fallback
// ============================================================
import React from 'react';
import { ReportCanvas } from './reportCanvas';
import { buildVirtualTemplate, buildReportData, classicTemplate } from './reportAdapter';
import { GOOGLE_FONTS_HREF } from './reportData';
import { supabaseService } from '../../services/supabaseService';
import './builder.css';

export function ReportTemplateView({ report, template: templateProp }) {
  // An explicit template prop or a snapshot saved on the report wins outright —
  // used directly (never stored in state) so unstable inline props can't loop.
  const direct = templateProp || (report && report.template) || null;
  const clientId = report && report.clientId;
  const [clientDefault, setClientDefault] = React.useState(null);

  // Load the Google Fonts used by the non-system typeface presets.
  React.useEffect(() => {
    if (document.getElementById('atb-google-fonts')) return;
    const link = document.createElement('link');
    link.id = 'atb-google-fonts';
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  // Only when no explicit/snapshot template: try the client's default (authenticated only).
  React.useEffect(() => {
    if (direct) return;
    let alive = true;
    if (clientId && supabaseService.getDefaultTemplateForClient) {
      supabaseService.getDefaultTemplateForClient(clientId)
        .then((t) => { if (alive) setClientDefault(t || null); })
        .catch(() => { if (alive) setClientDefault(null); });
    }
    return () => { alive = false; };
  }, [Boolean(direct), clientId]);

  const source = direct || clientDefault || classicTemplate();
  const vt = buildVirtualTemplate(report, source);
  const data = buildReportData(report);

  return (
    <div className="atb-root" style={{ display: 'block', overflow: 'visible', height: 'auto', minHeight: 0 }}>
      <ReportCanvas template={vt} data={data} interactive={false} />
    </div>
  );
}

export default ReportTemplateView;
