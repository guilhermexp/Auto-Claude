import pytest

from ideation.generator import IdeationGenerator
from ideation.phase_executor import PhaseExecutor


class _FakeGenerator:
    def get_prompt_file(self, _ideation_type: str) -> str | None:
        return "dummy.md"

    def get_type_label(self, _ideation_type: str) -> str:
        return "Code Improvements"

    async def run_agent(self, _prompt_file: str, additional_context: str = ""):
        _ = additional_context
        return False, "model access denied"

    async def run_recovery_agent(self, *_args, **_kwargs):
        return False


class _FakePrioritizer:
    def __init__(self):
        self.called = False

    def validate_ideation_output(self, _output_file, _ideation_type):
        self.called = True
        return {"success": False, "error": "should not be called", "count": 0}


@pytest.mark.asyncio
async def test_execute_ideation_type_returns_agent_error_without_validation(tmp_path):
    prioritizer = _FakePrioritizer()
    executor = PhaseExecutor(
        output_dir=tmp_path,
        generator=_FakeGenerator(),
        analyzer=object(),
        prioritizer=prioritizer,
        formatter=object(),
        enabled_types=["code_improvements"],
        max_ideas_per_type=5,
        refresh=True,
        append=False,
    )

    result = await executor.execute_ideation_type("code_improvements")

    assert result.success is False
    assert result.errors == ["model access denied"]
    assert prioritizer.called is False


@pytest.mark.asyncio
async def test_run_agent_retries_with_sonnet_when_opus_unavailable(tmp_path, monkeypatch):
    prompts_dir = tmp_path / "prompts"
    prompts_dir.mkdir()
    (prompts_dir / "dummy.md").write_text("Test prompt", encoding="utf-8")

    generator = IdeationGenerator(
        project_dir=tmp_path,
        output_dir=tmp_path,
        model="opus",
        thinking_level="medium",
    )
    generator.prompts_dir = prompts_dir

    attempted_models: list[str] = []

    class _FailingClient:
        def __init__(self, message: str):
            self._message = message

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            _ = (exc_type, exc, tb)
            return False

        async def query(self, _prompt):
            raise Exception(self._message)

        async def receive_response(self):
            if False:  # pragma: no cover
                yield None

    def _mock_create_client(_project_dir, _output_dir, model, **_kwargs):
        attempted_models.append(model)
        if len(attempted_models) == 1:
            return _FailingClient(
                "There's an issue with the selected model (claude-opus-4-6). "
                "It may not exist or you may not have access to it."
            )
        return _FailingClient("generic failure")

    monkeypatch.setattr("ideation.generator.create_client", _mock_create_client)

    success, error = await generator.run_agent("dummy.md")

    assert success is False
    assert error == "generic failure"
    assert attempted_models[0] == "claude-opus-4-6"
    assert attempted_models[1] == "claude-sonnet-4-5-20250929"
