"""設定のユニットテスト"""

from config import MODEL_ID, SYSTEM_PROMPT


class TestConfig:
    def test_model_id_is_haiku(self):
        assert "haiku" in MODEL_ID.lower()

    def test_model_id_has_us_prefix(self):
        assert MODEL_ID.startswith("us.")

    def test_system_prompt_is_japanese(self):
        assert "日本語" in SYSTEM_PROMPT

    def test_system_prompt_not_empty(self):
        assert len(SYSTEM_PROMPT.strip()) > 0
