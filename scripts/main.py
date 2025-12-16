from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import io
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import pyarrow.parquet as pq
from optimization import (
    ChunkedProcessor, 
    CacheManager, 
    optimize_dtypes, 
    get_memory_usage
)

app = FastAPI(title="Data Cleaning API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for datasets
datasets_cache: Dict[str, pd.DataFrame] = {}

chunked_processor = ChunkedProcessor(chunk_size=100000)
cache_manager = CacheManager(max_cache_size=10)

def detect_file_type(filename: str) -> str:
    """Detect file type from filename"""
    if filename.endswith('.csv'):
        return 'csv'
    elif filename.endswith(('.xlsx', '.xls')):
        return 'excel'
    elif filename.endswith('.json'):
        return 'json'
    elif filename.endswith('.parquet'):
        return 'parquet'
    else:
        raise ValueError(f"Unsupported file type: {filename}")

def read_file(file: UploadFile) -> pd.DataFrame:
    """Read file into pandas DataFrame"""
    file_type = detect_file_type(file.filename)
    content = file.file.read()
    
    if file_type == 'csv':
        return pd.read_csv(io.BytesIO(content), encoding='utf-8')
    elif file_type == 'excel':
        return pd.read_excel(io.BytesIO(content))
    elif file_type == 'json':
        return pd.read_json(io.BytesIO(content))
    elif file_type == 'parquet':
        return pd.read_parquet(io.BytesIO(content))

def get_column_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate comprehensive statistics for each column"""
    stats = {}
    
    for col in df.columns:
        col_data = df[col]
        col_stats = {
            'name': col,
            'dtype': str(col_data.dtype),
            'total_rows': len(col_data),
            'missing_count': int(col_data.isna().sum()),
            'missing_percentage': float(col_data.isna().sum() / len(col_data) * 100),
            'unique_count': int(col_data.nunique()),
            'duplicate_count': int(len(col_data) - col_data.nunique()),
        }
        
        # Add numeric-specific stats
        if pd.api.types.is_numeric_dtype(col_data):
            col_stats.update({
                'mean': float(col_data.mean()) if not col_data.isna().all() else None,
                'median': float(col_data.median()) if not col_data.isna().all() else None,
                'std': float(col_data.std()) if not col_data.isna().all() else None,
                'min': float(col_data.min()) if not col_data.isna().all() else None,
                'max': float(col_data.max()) if not col_data.isna().all() else None,
            })
        
        # Add string-specific stats
        elif pd.api.types.is_string_dtype(col_data) or col_data.dtype == 'object':
            col_stats['most_common'] = col_data.value_counts().head(5).to_dict()
        
        stats[col] = col_stats
    
    return stats

@app.get("/")
async def root():
    return {"message": "Data Cleaning API is running", "version": "1.0.0"}

@app.get("/api/stats/performance")
async def get_performance_stats():
    """Get performance and cache statistics"""
    return {
        "cache_stats": cache_manager.get_stats(),
        "chunked_processing": chunked_processor.get_stats(),
        "datasets_cached": len(datasets_cache),
    }

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and analyze a dataset"""
    try:
        # Read file
        df = read_file(file)
        
        df = optimize_dtypes(df)
        memory_info = get_memory_usage(df)
        
        # Generate unique ID for this dataset
        dataset_id = f"{file.filename}_{datetime.now().timestamp()}"
        
        # Cache the dataset
        datasets_cache[dataset_id] = df
        
        # Generate statistics
        stats = get_column_stats(df)
        
        # Get preview data (first 100 rows)
        preview = df.head(100).to_dict('records')
        
        return {
            "dataset_id": dataset_id,
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns),
            "stats": stats,
            "preview": preview,
            "memory_usage_mb": memory_info['total_mb'],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/clean/missing")
async def handle_missing_values(
    dataset_id: str,
    strategy: str,
    columns: Optional[List[str]] = None
):
    """Handle missing values using various strategies"""
    if dataset_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    cache_key = cache_manager.generate_cache_key(
        dataset_id, 
        'missing', 
        {'strategy': strategy, 'columns': str(columns)}
    )
    
    cached_result = cache_manager.get(cache_key)
    if cached_result is not None:
        stats = get_column_stats(cached_result)
        preview = cached_result.head(100).to_dict('records')
        return {
            "success": True,
            "rows": len(cached_result),
            "stats": stats,
            "preview": preview,
            "from_cache": True,
        }
    
    df = datasets_cache[dataset_id].copy()
    cols_to_clean = columns if columns else df.columns.tolist()
    
    try:
        def clean_missing(chunk_df, strategy, cols):
            for col in cols:
                if col not in chunk_df.columns:
                    continue
                    
                if strategy == "remove":
                    chunk_df = chunk_df.dropna(subset=[col])
                elif strategy == "mean" and pd.api.types.is_numeric_dtype(chunk_df[col]):
                    chunk_df[col].fillna(chunk_df[col].mean(), inplace=True)
                elif strategy == "median" and pd.api.types.is_numeric_dtype(chunk_df[col]):
                    chunk_df[col].fillna(chunk_df[col].median(), inplace=True)
                elif strategy == "mode":
                    mode_val = chunk_df[col].mode()[0] if not chunk_df[col].mode().empty else None
                    if mode_val is not None:
                        chunk_df[col].fillna(mode_val, inplace=True)
                elif strategy == "forward":
                    chunk_df[col].fillna(method='ffill', inplace=True)
                elif strategy == "backward":
                    chunk_df[col].fillna(method='bfill', inplace=True)
            return chunk_df
        
        if len(df) > 100000:
            df = chunked_processor.process_in_chunks(
                df, 
                clean_missing, 
                strategy=strategy, 
                cols=cols_to_clean
            )
        else:
            df = clean_missing(df, strategy, cols_to_clean)
        
        # Update cache
        datasets_cache[dataset_id] = df
        cache_manager.set(cache_key, df)
        
        # Get updated stats
        stats = get_column_stats(df)
        preview = df.head(100).to_dict('records')
        
        return {
            "success": True,
            "rows": len(df),
            "stats": stats,
            "preview": preview,
            "from_cache": False,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/clean/duplicates")
async def remove_duplicates(dataset_id: str, subset: Optional[List[str]] = None):
    """Remove duplicate rows"""
    if dataset_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    df = datasets_cache[dataset_id].copy()
    
    try:
        initial_rows = len(df)
        df = df.drop_duplicates(subset=subset, keep='first')
        removed_count = initial_rows - len(df)
        
        # Update cache
        datasets_cache[dataset_id] = df
        
        stats = get_column_stats(df)
        preview = df.head(100).to_dict('records')
        
        return {
            "success": True,
            "rows": len(df),
            "removed_count": removed_count,
            "stats": stats,
            "preview": preview,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/clean/standardize")
async def standardize_data(
    dataset_id: str,
    column: str,
    operation: str
):
    """Standardize data formats (dates, strings, numeric)"""
    if dataset_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    df = datasets_cache[dataset_id].copy()
    
    if column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column {column} not found")
    
    try:
        if operation == "lowercase":
            df[column] = df[column].astype(str).str.lower()
        elif operation == "uppercase":
            df[column] = df[column].astype(str).str.upper()
        elif operation == "trim":
            df[column] = df[column].astype(str).str.strip()
        elif operation == "parse_date":
            df[column] = pd.to_datetime(df[column], errors='coerce')
        elif operation == "to_numeric":
            df[column] = pd.to_numeric(df[column], errors='coerce')
        
        # Update cache
        datasets_cache[dataset_id] = df
        
        stats = get_column_stats(df)
        preview = df.head(100).to_dict('records')
        
        return {
            "success": True,
            "rows": len(df),
            "stats": stats,
            "preview": preview,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/export/{dataset_id}")
async def export_dataset(dataset_id: str, format: str = "csv"):
    """Export cleaned dataset in specified format"""
    if dataset_id not in datasets_cache:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    df = datasets_cache[dataset_id]
    
    try:
        if format == "csv":
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=cleaned_{dataset_id}.csv"}
            )
        elif format == "json":
            output = df.to_json(orient='records', indent=2)
            return StreamingResponse(
                io.BytesIO(output.encode()),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=cleaned_{dataset_id}.json"}
            )
        elif format == "parquet":
            output = io.BytesIO()
            df.to_parquet(output, index=False)
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/octet-stream",
                headers={"Content-Disposition": f"attachment; filename=cleaned_{dataset_id}.parquet"}
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/dataset/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Remove dataset from cache"""
    if dataset_id in datasets_cache:
        del datasets_cache[dataset_id]
        return {"success": True, "message": "Dataset deleted"}
    raise HTTPException(status_code=404, detail="Dataset not found")

@app.post("/api/cache/clear")
async def clear_cache():
    """Clear operation cache"""
    cache_manager.clear()
    return {"success": True, "message": "Cache cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
