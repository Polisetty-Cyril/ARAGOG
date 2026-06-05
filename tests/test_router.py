from pathlib import Path
import json
import sys

import numpy as np
import torch

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from models.medical_qa_inference import MedicalMoE  # noqa: E402


def _text_to_vector(text: str, dimension: int = 384) -> torch.Tensor:
    vector = np.zeros(dimension, dtype=np.float32)
    for index, byte in enumerate(text.encode("utf-8")):
        vector[index % dimension] += byte / 255.0
    norm = np.linalg.norm(vector)
    if norm:
        vector /= norm
    return torch.from_numpy(vector).unsqueeze(0)


def test_router_returns_domain_label():
    checkpoint_dir = BACKEND_DIR / "checkpoints" / "medical_qa_v1.0"
    with open(checkpoint_dir / "metadata.json", "r", encoding="utf-8") as handle:
        metadata = json.load(handle)

    model = MedicalMoE(
        input_dim=384,
        hidden_dim=512,
        output_dim=384,
        num_experts=metadata["num_domains"],
        top_k=2,
    )
    checkpoint = torch.load(checkpoint_dir / "moe_router.pt", map_location="cpu")
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    query = "What are the warning signs of a heart attack?"
    query_vector = _text_to_vector(query)

    with torch.no_grad():
        router_logits = model(query_vector, return_router_logits=True)
        predicted_index = int(torch.argmax(router_logits, dim=-1).item())

    domain_label = metadata["domain_list"][predicted_index]
    assert isinstance(domain_label, str)
    assert domain_label
