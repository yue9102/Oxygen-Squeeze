import json
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import main as main_module
from main import _reflection_episode_context
from voice_guidance import (
    _parse_json,
    fallback_reflection,
    normalize_reflection_result,
)


def _valid_model_result():
    return {
        "conclusion": "我认为关键是先形成自己的判断",
        "points": ["先说明结论", "再给出理由"],
        "open_questions": ["什么证据能支撑这个判断？"],
        "unknown_top_level": "drop me",
        "guidance": {
            "schema_version": "made-up-version",
            "status": "ok",
            "user_position": "用户认为表达是知识内化的标志",
            "relevance": "direct",
            "logic": {
                "conclusion_status": "clear",
                "structure_status": "partly_clear",
                "reasoning_status": "partial",
                "strengths": [
                    {"message": "已经直接回应问题", "answer_quote": "先形成自己的判断"},
                    {"message": "给出了因果关系", "answer_quote": "并不存在的原话"},
                    {"message": "第三条应被裁剪"},
                ],
                "improvements": [{"message": "可以补充一个具体理由"}],
            },
            "episode_alignment": {
                "supported": [
                    {"message": "连接到了本期的输出观点", "basis_id": "K1"},
                    {"message": "伪造依据必须丢弃", "basis_id": "K9"},
                ],
                "missing_angles": ["还可以说明复述与理解的差别"],
            },
            "verification_hint": {
                "claim": "某概念只有一个定义",
                "reason": "需要核实 http://invented.example/source",
                "status": "different_from_episode_context",
                "episode_basis_id": "K9",
                "search_query": "概念 定义 https://invented.example",
            },
            "supplementary_angles": [{
                "angle": "补充应用场景",
                "why_relevant": "能让理由更具体",
                "origin": "invalid-origin",
            }],
            "reference_answer": {
                "conclusion": "我认为关键是先形成自己的判断",
                "points": ["先说结论", "再说明理由"],
                "ai_additions": ["应用场景 http://invented.example"],
            },
            "open_question": "下一次能否用一个例子解释？",
            "limitations": [],
            "confidence": "medium",
            "unknown": {"source_url": "https://invented.example"},
        },
    }


class ReflectionContextTests(unittest.TestCase):
    def test_context_is_bounded_and_server_assigns_ids(self):
        raw = [
            {"source_id": "evil", "headline": f"标题{i}", "body": "内容"}
            for i in range(7)
        ]
        context = _reflection_episode_context("https://episode", "摘要", json.dumps(raw))
        self.assertEqual([item["source_id"] for item in context["knowledge_points"]], ["K1", "K2", "K3", "K4", "K5"])
        self.assertEqual(len(context["knowledge_points"]), 5)
        self.assertEqual(context["context_level"], "cards_only")

    def test_invalid_context_json_degrades_to_empty_cards(self):
        context = _reflection_episode_context("", "摘要", "not-json")
        self.assertEqual(context["knowledge_points"], [])


class GuidanceNormalizationTests(unittest.TestCase):
    def setUp(self):
        self.raw_answer = "我认为要先形成自己的判断，再用理由把判断说清楚。"
        self.context = {
            "summary": "表达帮助知识内化",
            "knowledge_points": [{"source_id": "client-id", "headline": "从输入到输出", "body": "输出促使用户形成自己的理解"}],
        }

    def test_normalizer_whitelists_basis_and_removes_urls(self):
        result = normalize_reflection_result(_valid_model_result(), self.raw_answer, self.context)
        guidance = result["guidance"]
        self.assertEqual(guidance["schema_version"], "voice_guidance.v1")
        self.assertNotIn("unknown_top_level", result)
        self.assertEqual(len(guidance["logic"]["strengths"]), 2)
        self.assertNotIn("answer_quote", guidance["logic"]["strengths"][1])
        self.assertEqual(len(guidance["episode_alignment"]["supported"]), 1)
        self.assertEqual(guidance["episode_alignment"]["supported"][0]["basis_id"], "K1")
        self.assertIn("从输入到输出", guidance["episode_alignment"]["supported"][0]["basis_text"])
        self.assertEqual(guidance["verification_hint"]["status"], "needs_verification")
        self.assertNotIn("episode_basis_id", guidance["verification_hint"])
        self.assertNotIn("http", json.dumps(result, ensure_ascii=False))
        self.assertEqual(guidance["supplementary_angles"][0]["origin"], "reasoning_framework")

    def test_normalizer_removes_bare_links_timestamps_and_attribution(self):
        model_result = _valid_model_result()
        model_result["conclusion"] = "结论见 example.com/source，节目位置 12:30"
        model_result["points"] = ["参考来源：某机构", "附件 ftp://files.example.org/a"]
        result = normalize_reflection_result(model_result, self.raw_answer, self.context)
        serialized = json.dumps(result, ensure_ascii=False)
        self.assertNotIn("example.com", serialized)
        self.assertNotIn("ftp://", serialized)
        self.assertNotIn("12:30", serialized)
        self.assertNotIn("参考来源", serialized)

    def test_missing_cards_limits_content_guidance(self):
        model_result = _valid_model_result()
        model_result["guidance"]["supplementary_angles"][0]["origin"] = "podcast_context"
        result = normalize_reflection_result(model_result, self.raw_answer, {"summary": "只有摘要"})
        self.assertEqual(result["guidance"]["status"], "limited")
        self.assertEqual(result["guidance"]["episode_alignment"]["supported"], [])
        self.assertEqual(result["guidance"]["episode_alignment"]["missing_angles"], [])
        self.assertEqual(result["guidance"]["supplementary_angles"][0]["origin"], "reasoning_framework")
        self.assertIn("没有足够", result["guidance"]["limitations"][0])

    def test_fallback_keeps_storable_shape(self):
        result = fallback_reflection(self.raw_answer, self.context, "secret provider error")
        self.assertEqual(result["guidance"]["status"], "needs_retry")
        self.assertIsNone(result["guidance"]["reference_answer"])
        self.assertEqual(result["conclusion"], "")
        self.assertNotIn("secret provider error", json.dumps(result, ensure_ascii=False))

    def test_needs_retry_clears_model_generated_guidance(self):
        model_result = _valid_model_result()
        model_result["guidance"]["status"] = "needs_retry"
        result = normalize_reflection_result(model_result, self.raw_answer, self.context)
        guidance = result["guidance"]
        self.assertEqual(result["conclusion"], "")
        self.assertEqual(result["points"], [])
        self.assertEqual(guidance["logic"]["strengths"], [])
        self.assertEqual(guidance["episode_alignment"]["supported"], [])
        self.assertIsNone(guidance["verification_hint"])
        self.assertEqual(guidance["supplementary_angles"], [])
        self.assertIsNone(guidance["reference_answer"])

    def test_off_topic_only_keeps_safe_redirect_guidance(self):
        model_result = _valid_model_result()
        model_result["guidance"]["relevance"] = "off_topic"
        result = normalize_reflection_result(model_result, self.raw_answer, self.context)
        guidance = result["guidance"]
        self.assertEqual(guidance["status"], "limited")
        self.assertEqual(result["conclusion"], "")
        self.assertEqual(guidance["user_position"], "")
        self.assertEqual(guidance["episode_alignment"], {"supported": [], "missing_angles": []})
        self.assertIsNone(guidance["verification_hint"])
        self.assertEqual(guidance["supplementary_angles"], [])
        self.assertIsNone(guidance["reference_answer"])
        self.assertIn("没有直接回应", guidance["logic"]["improvements"][0]["message"])

    def test_fenced_json_is_parseable(self):
        self.assertEqual(_parse_json('```json\n{"ok": true}\n```'), {"ok": True})

    def test_manual_eval_set_contains_eight_unique_cases(self):
        path = Path(__file__).with_name("voice_guidance_eval_cases.json")
        cases = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(len(cases), 8)
        self.assertEqual(len({case["id"] for case in cases}), 8)


class ReflectionEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def test_guidance_failure_still_returns_raw_text_and_deletes_audio(self):
        class FakeAudio:
            filename = "answer.m4a"

            async def read(self):
                return b"fake-audio"

        class FakeRequest:
            headers = {"host": "example.test"}

        before = set(main_module._TMP_AUDIO.iterdir())
        with patch.object(main_module, "transcribe_short", AsyncMock(return_value="这是用户已经完成的原始回答。")), patch.object(
            main_module,
            "refine_reflection",
            AsyncMock(side_effect=RuntimeError("provider failed")),
        ):
            response = await main_module.create_reflection(
                FakeRequest(),
                FakeAudio(),
                "episode-1",
                "单集标题",
                "播客名称",
                "反思问题",
                "https://episode",
                "本期摘要",
                '[{"headline":"知识点","body":"知识内容"}]',
            )

        reflection = response["reflection"]
        self.assertEqual(reflection["raw_text"], "这是用户已经完成的原始回答。")
        self.assertEqual(reflection["guidance"]["status"], "needs_retry")
        self.assertEqual(set(main_module._TMP_AUDIO.iterdir()), before)


if __name__ == "__main__":
    unittest.main()
