import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_FALLBACK_URL } from '../utils/foodImages';

/**
 * Food/restaurant image with lazy loading and a chain of fallbacks.
 */
export default function FoodImage({
  src,
  alt,
  className,
  fallback,
  loading = 'lazy',
  fetchPriority,
}) {
  const candidates = useMemo(
    () => [...new Set([src, fallback, DEFAULT_FALLBACK_URL].filter(Boolean))],
    [src, fallback]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src, fallback]);

  const url = candidates[index] || DEFAULT_FALLBACK_URL;

  return (
    <img
      src={url}
      alt={alt || ''}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      onError={() => {
        setIndex((i) => (i < candidates.length - 1 ? i + 1 : i));
      }}
    />
  );
}
