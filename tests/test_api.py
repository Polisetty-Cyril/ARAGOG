from pathlib import Path
import sys

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import main as backend_main  # noqa: E402
from services.medical_qa_service import MedicalQAService  # noqa: E402


def test_api_ask_endpoint(monkeypatch):
    monkeypatch.setattr(backend_main.db, "create_tables", lambda: None)
    monkeypatch.setattr(MedicalQAService, "load_system", lambda self: None)
    monkeypatch.setattr(
        MedicalQAService,
        "answer_question",
        lambda self, question, k=5: {
            "best_answer": "Chest pain can be caused by heart, lung, or digestive conditions.",
            "confidence_score": 0.93,
            "selected_experts": ["Cardiology"],
            "status": "success",
            "candidates_count": 1,
        },
    )

    with TestClient(backend_main.app) as client:
        response = client.post("/api/ask", json={"question": "What causes chest pain?"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"]
    assert payload["domains"] == ["Cardiology"]
