"use client";

import { useState } from "react";

/** Вкладки без перехода по страницам: нажатие не прокручивает вверх. */
export function Tabs({ tabs }: { tabs: { key: string; label: string; count?: number; panel: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div className="space-y-5">
      <div role="tablist" className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === active}
            onClick={() => setActive(tab.key)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-base font-semibold transition ${
              tab.key === active ? "border-neon text-snow" : "border-transparent text-snow-dim hover:text-snow"
            }`}
          >
            {tab.label}
            {tab.count ? <span className="ml-1.5 text-sm font-normal text-snow-dim">{tab.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.find((tab) => tab.key === active)?.panel}
    </div>
  );
}
