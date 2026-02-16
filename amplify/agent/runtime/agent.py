"""Voice Agent - SSE ストリーミング（@app.entrypoint）"""

from bedrock_agentcore import BedrockAgentCoreApp
from strands import Agent

from config import MODEL_ID, SYSTEM_PROMPT
from tools import get_current_time, simple_calculator

app = BedrockAgentCoreApp()

# セッションごとの Agent インスタンスを管理
_agent_sessions: dict[str, Agent] = {}

TOOLS = [get_current_time, simple_calculator]


def get_or_create_agent(session_id: str | None) -> Agent:
    """セッションIDに対応する Agent を取得または作成"""
    if not session_id:
        return Agent(
            model=MODEL_ID,
            system_prompt=SYSTEM_PROMPT,
            tools=TOOLS,
        )

    if session_id in _agent_sessions:
        return _agent_sessions[session_id]

    agent = Agent(
        model=MODEL_ID,
        system_prompt=SYSTEM_PROMPT,
        tools=TOOLS,
    )
    _agent_sessions[session_id] = agent
    return agent


@app.entrypoint
async def invoke(payload, context):
    """SSE ストリーミングエンドポイント"""
    session_id = payload.get("session_id")
    prompt = payload.get("prompt", "")

    agent = get_or_create_agent(session_id)

    async for event in agent.stream_async(prompt):
        if "data" in event:
            yield {"type": "text", "data": event["data"]}
        elif "current_tool_use" in event:
            tool_info = event["current_tool_use"]
            tool_name = tool_info.get("name", "unknown")
            yield {"type": "tool_use", "data": tool_name}


if __name__ == "__main__":
    app.run()
