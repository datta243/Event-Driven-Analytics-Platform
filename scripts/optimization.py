"""
Optimization utilities for handling large datasets with chunked processing
"""
import pandas as pd
import numpy as np
from typing import Iterator, Callable
import time
from functools import lru_cache
import hashlib


class ChunkedProcessor:
    """Process large datasets in chunks for memory efficiency"""
    
    def __init__(self, chunk_size: int = 100000):
        self.chunk_size = chunk_size
        self.processing_stats = {
            'chunks_processed': 0,
            'total_time': 0,
            'avg_chunk_time': 0
        }
    
    def process_in_chunks(
        self, 
        df: pd.DataFrame, 
        operation: Callable,
        **kwargs
    ) -> pd.DataFrame:
        """Process dataframe in chunks for better performance"""
        
        if len(df) <= self.chunk_size:
            return operation(df, **kwargs)
        
        start_time = time.time()
        chunks = []
        
        # Split into chunks
        for start_idx in range(0, len(df), self.chunk_size):
            end_idx = min(start_idx + self.chunk_size, len(df))
            chunk = df.iloc[start_idx:end_idx].copy()
            
            # Process chunk
            processed_chunk = operation(chunk, **kwargs)
            chunks.append(processed_chunk)
            
            self.processing_stats['chunks_processed'] += 1
        
        # Combine chunks
        result = pd.concat(chunks, ignore_index=True)
        
        # Update stats
        self.processing_stats['total_time'] = time.time() - start_time
        self.processing_stats['avg_chunk_time'] = (
            self.processing_stats['total_time'] / 
            self.processing_stats['chunks_processed']
        )
        
        return result
    
    def get_stats(self) -> dict:
        """Return processing statistics"""
        return self.processing_stats


class CacheManager:
    """Manage caching for repeated operations"""
    
    def __init__(self, max_cache_size: int = 10):
        self.cache = {}
        self.max_cache_size = max_cache_size
        self.cache_hits = 0
        self.cache_misses = 0
    
    def generate_cache_key(self, dataset_id: str, operation: str, params: dict) -> str:
        """Generate unique cache key for operation"""
        param_str = str(sorted(params.items()))
        key_str = f"{dataset_id}_{operation}_{param_str}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> pd.DataFrame | None:
        """Get cached result"""
        if key in self.cache:
            self.cache_hits += 1
            return self.cache[key].copy()
        self.cache_misses += 1
        return None
    
    def set(self, key: str, value: pd.DataFrame):
        """Cache result"""
        if len(self.cache) >= self.max_cache_size:
            # Remove oldest entry
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[key] = value.copy()
    
    def clear(self):
        """Clear all cached data"""
        self.cache.clear()
        self.cache_hits = 0
        self.cache_misses = 0
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        total_requests = self.cache_hits + self.cache_misses
        hit_rate = (
            (self.cache_hits / total_requests * 100) 
            if total_requests > 0 else 0
        )
        
        return {
            'cache_size': len(self.cache),
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'hit_rate': round(hit_rate, 2),
        }


def optimize_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """Optimize DataFrame memory usage by downcasting dtypes"""
    
    for col in df.columns:
        col_type = df[col].dtype
        
        # Optimize integers
        if col_type == 'int64':
            df[col] = pd.to_numeric(df[col], downcast='integer')
        
        # Optimize floats
        elif col_type == 'float64':
            df[col] = pd.to_numeric(df[col], downcast='float')
        
        # Convert object to category if low cardinality
        elif col_type == 'object':
            num_unique = df[col].nunique()
            num_total = len(df[col])
            if num_unique / num_total < 0.5:
                df[col] = df[col].astype('category')
    
    return df


def get_memory_usage(df: pd.DataFrame) -> dict:
    """Get detailed memory usage statistics"""
    
    memory_bytes = df.memory_usage(deep=True).sum()
    memory_mb = memory_bytes / (1024 * 1024)
    
    col_memory = df.memory_usage(deep=True).to_dict()
    col_memory_mb = {k: v / (1024 * 1024) for k, v in col_memory.items()}
    
    return {
        'total_bytes': memory_bytes,
        'total_mb': round(memory_mb, 2),
        'by_column': col_memory_mb,
    }


def parallel_process_columns(
    df: pd.DataFrame,
    columns: list,
    operation: Callable,
    **kwargs
) -> pd.DataFrame:
    """Process multiple columns in parallel (simulated for single-threaded env)"""
    
    result_df = df.copy()
    
    for col in columns:
        if col in df.columns:
            result_df[col] = operation(df[col], **kwargs)
    
    return result_df
