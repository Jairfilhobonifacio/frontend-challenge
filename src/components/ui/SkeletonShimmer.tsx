import React from 'react';

export const SkeletonShimmer: React.FC<{ height?: number | string; aspectRatio?: string }> = ({
  height = 240,
  aspectRatio
}) => (
  <div
    className="skeleton-shimmer"
    role="status"
    aria-label="Carregando conteúdo do arquivo"
    style={{ height: aspectRatio ? 'auto' : height, aspectRatio }}
  />
);
