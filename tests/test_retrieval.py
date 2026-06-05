from pathlib import Path
import pickle
import sys

import faiss
import numpy as np

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))


def _text_to_vector(text: str, dimension: int = 384) -> np.ndarray:
    vector = np.zeros(dimension, dtype=np.float32)
    for index, byte in enumerate(text.encode("utf-8")):
        vector[index % dimension] += byte / 255.0
    norm = np.linalg.norm(vector)
    if norm:
        vector /= norm
    return vector.reshape(1, -1).astype(np.float32)


def test_faiss_retrieval_returns_results():
    index_root = BACKEND_DIR / "checkpoints" / "medical_qa_v1.0" / "faiss_indexes"
    index_path = index_root / "Cardiology_index.faiss"
    docs_path = index_root / "Cardiology_docs.pkl"

    index = faiss.read_index(str(index_path))
    with open(docs_path, "rb") as handle:
        docs = pickle.load(handle)

    query_vector = _text_to_vector("What causes chest pain and shortness of breath?")
    distances, indices = index.search(query_vector, 5)

    assert distances.shape[1] > 0
    assert indices.shape[1] > 0
    assert any(index_value != -1 for index_value in indices[0])
    assert len(docs) > 0
