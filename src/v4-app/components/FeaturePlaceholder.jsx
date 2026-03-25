import React from 'react';
import { Construction } from 'lucide-react';

/**
 * Temporary shell for V4 routes not yet ported from V3.
 * Keeps routing/navigation valid while features are implemented.
 */
export default function FeaturePlaceholder({ title, description }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
          <Construction className="w-5 h-5 text-[#0071e3]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
            {title}
          </h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            V4 — parity with V3 in progress
          </p>
        </div>
      </div>
      <div className="px-6 py-8">
        <p className="text-[15px] text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed max-w-2xl">
          {description}
        </p>
      </div>
    </div>
  );
}
