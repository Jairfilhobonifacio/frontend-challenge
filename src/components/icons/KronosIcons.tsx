import React from 'react';
import { kronosIconMarkup } from './kronos-icon-data';
export type KronosIconName = keyof typeof kronosIconMarkup;

/** Canonical repository-owned SVGs. Never accept user-provided markup. */
export const KronosIcon: React.FC<{ name: KronosIconName; className?: string }> = ({ name, className = 'k-ico' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"
    dangerouslySetInnerHTML={{ __html: kronosIconMarkup[name] }} />
);
