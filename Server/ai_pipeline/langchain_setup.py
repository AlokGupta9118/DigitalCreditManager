"""
LangChain Setup — Central configuration for LLM, embeddings, and vector store.
Uses Groq for fast cloud LLM inference, sentence-transformers for embeddings.
"""
import os
import sys
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    GROQ_API_KEY, GROQ_MODEL,
    OLLAMA_MODEL, OLLAMA_BASE_URL,
    EMBEDDING_MODEL, CHROMA_DB_DIR, CHROMA_COLLECTION_NAME,
)

logger = logging.getLogger(__name__)

_cached_llm = None

def get_llm(temperature: float = 0.1):
    """
    Get the LLM — uses Groq with a native LangChain fallback strategy.
    Strategy:
    1. Try llama-3.3-70b-versatile (high reasoning)
    2. Fallback to llama-3.1-8b-instant if rate limited (429)
    3. Fallback to local Ollama if Groq is entirely unavailable
    """
    global _cached_llm
    
    if _cached_llm is not None:
        return _cached_llm
    
    from langchain_groq import ChatGroq
    from langchain_ollama import ChatOllama
    
    # Define models
    primary = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=GROQ_API_KEY,
        temperature=temperature,
    )
    
    secondary = ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=GROQ_API_KEY,
        temperature=temperature,
    )
    
    fallback_ollama = ChatOllama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=temperature,
    )
    
    # Use native LangChain fallback mechanism
    # This ensures that if ANY call to the LLM hits a rate limit, it automatically tries the next one.
    llm_with_fallbacks = primary.with_fallbacks([secondary, fallback_ollama])
    
    logger.info("LLM initialized with native fallbacks (70B -> 8B -> Ollama)")
    _cached_llm = llm_with_fallbacks
    return _cached_llm


def get_embeddings(model_name: str = None):
    """Get LangChain-compatible embeddings using sentence-transformers."""
    global _embeddings
    if _embeddings is None:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        _embeddings = HuggingFaceEmbeddings(
            model_name=model_name or EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
        )
        logger.info(f"Embeddings initialized: {model_name or EMBEDDING_MODEL}")
    return _embeddings


def get_vectorstore(collection_name: str = None, persist_dir: str = None):
    """Get LangChain-compatible ChromaDB vector store."""
    global _vectorstore
    if _vectorstore is None:
        from langchain_chroma import Chroma
        _vectorstore = Chroma(
            collection_name=collection_name or CHROMA_COLLECTION_NAME,
            embedding_function=get_embeddings(),
            persist_directory=persist_dir or CHROMA_DB_DIR,
        )
        logger.info("ChromaDB vector store initialized")
    return _vectorstore


def get_retriever(search_k: int = 5, filter_dict: dict = None):
    """Get a LangChain retriever from the vector store."""
    vs = get_vectorstore()
    search_kwargs = {"k": search_k}
    if filter_dict:
        search_kwargs["filter"] = filter_dict
    return vs.as_retriever(search_kwargs=search_kwargs)
