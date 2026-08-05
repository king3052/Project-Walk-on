import json
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq_with_tools
from app.core.agent_tools import TOOL_HANDLERS, TOOL_SCHEMAS
from app.core.web_search import is_configured as web_search_configured
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/assistant", tags=["assistant"])

MAX_TOOL_ITERATIONS = 4
WRITE_TOOL_PREFIXES = ("log_", "create_")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


def _system_prompt(user):
    sport = user.sport or "Basketball"
    web_note = (
        "You have live web search available — use it for anything current or that you're not certain "
        "about, rather than guessing from memory."
        if web_search_configured()
        else "Web search is not configured right now — say so if asked to look something up live, "
        "rather than guessing."
    )
    return (
        f"You are this athlete's personal performance assistant, integrated into their training app. "
        f"Their name is {user.name} and they play {sport}. You have tools to read their real logged "
        f"data (matches, training, goals, tournaments, weight, schedule, scouting) and to log new "
        f"entries or create goals/tournaments directly when asked — do this immediately when the "
        f"athlete asks you to, don't ask for confirmation first. {web_note} Never invent a stat, date, "
        f"or fact — use a tool to check instead of guessing whenever you're not certain. Be direct and "
        f"concise, like a real coach texting back, not a customer service bot."
    )


@router.post("/chat")
def chat(
    payload: ChatRequest,
    current_user_id: str = Depends(check_ai_rate_limit),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).get(current_user_id)
    messages = [{"role": "system", "content": _system_prompt(user)}]
    messages += [{"role": m.role, "content": m.content} for m in payload.messages]

    # Persist the new user message now — payload.messages is the full
    # conversation the frontend is tracking, so the last one is the new turn.
    if payload.messages:
        latest_user_message = payload.messages[-1]
        db.add(models.AssistantMessage(
            user_id=current_user_id, role=latest_user_message.role, content=latest_user_message.content,
        ))
        db.commit()

    actions_taken = []

    for _ in range(MAX_TOOL_ITERATIONS):
        assistant_message = call_groq_with_tools(messages, TOOL_SCHEMAS)
        tool_calls = assistant_message.get("tool_calls")

        if not tool_calls:
            reply = assistant_message.get("content", "")
            db.add(models.AssistantMessage(
                user_id=current_user_id, role="assistant", content=reply,
                actions_taken=json.dumps(actions_taken) if actions_taken else None,
            ))
            db.commit()
            return {"reply": reply, "actions_taken": actions_taken}

        messages.append(assistant_message)

        for call in tool_calls:
            name = call["function"]["name"]
            try:
                args = json.loads(call["function"]["arguments"] or "{}")
            except json.JSONDecodeError:
                args = {}

            handler = TOOL_HANDLERS.get(name)
            if not handler:
                result = {"error": f"Unknown tool: {name}"}
            else:
                try:
                    result = handler(db, current_user_id, **args)
                    if name.startswith(WRITE_TOOL_PREFIXES):
                        actions_taken.append({"tool": name, "args": args, "result": result})
                except Exception as e:
                    result = {"error": str(e)}

            messages.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": json.dumps(result),
            })

    fallback_reply = "I did a few things but I'm not fully done reasoning about this — try asking again if something's missing."
    db.add(models.AssistantMessage(
        user_id=current_user_id, role="assistant", content=fallback_reply,
        actions_taken=json.dumps(actions_taken) if actions_taken else None,
    ))
    db.commit()
    return {"reply": fallback_reply, "actions_taken": actions_taken}


@router.get("/history", response_model=list[schemas.AssistantMessageOut])
def get_history(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return (
        db.query(models.AssistantMessage)
        .filter(models.AssistantMessage.user_id == current_user_id)
        .order_by(models.AssistantMessage.created_at.asc())
        .all()
    )


@router.delete("/history")
def clear_history(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    db.query(models.AssistantMessage).filter(models.AssistantMessage.user_id == current_user_id).delete(
        synchronize_session=False
    )
    db.commit()
    return {"cleared": True}
