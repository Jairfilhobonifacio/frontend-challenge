import React, { useEffect, useRef } from 'react';
import type { NftArtifact } from '@/contracts/kronos.types';
import { renderGenerativeArtworkToCanvas } from '@/lib/generative-canvas';

export const GenerativeMedia: React.FC<{ nft: NftArtifact; size?: number }> = ({ nft, size = 560 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!nft.mediaUrl?.startsWith('data:image') && canvasRef.current && nft.recipe) {
      renderGenerativeArtworkToCanvas(canvasRef.current, nft.recipe);
    }
  }, [nft]);

  if (nft.mediaUrl?.startsWith('data:image')) {
    return <img src={nft.mediaUrl} alt={nft.title} width={size} height={size} loading="lazy" />;
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-label={`Obra generativa ${nft.title}`}
      style={{ width: '100%', aspectRatio: '1 / 1' }}
    />
  );
};
