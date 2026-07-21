import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq

router = APIRouter(prefix="/quick-log", tags=["quick-log"])


class QuickLogRequest(BaseModel):
    text: str


class QuickLogResult(BaseModel):
    log_type: str  # strength | shooting | nutrition | recovery | conditioning | bodyweight | unknown
    summary: str
    fields: dict


@router.post("/parse", response_model=QuickLogResult)
def parse_quick_log(payload: QuickLogRequest, current_user_id: str = Depends(check_ai_rate_limit)):
    prompt = f"""Parse this athlete's quick log entry into structured JSON.
Respond with ONLY valid JSON in exactly this shape:
{{"log_type": "strength|shooting|nutrition|recovery|conditioning|bodyweight|unknown",
  "summary": "one short sentence describing what will be logged",
  "fields": {{ ...fields matching the type below... }}}}

Field shapes by type:
- strength: {{"exercise": string, "sets": int, "reps": int, "weight_lb": number, "rpe": int or null, "duration_min": int or null}}
- shooting: {{"shot_type": string, "attempts": int, "makes": int}}
- nutrition: {{"calories": int or null, "protein_g": number or null, "carbs_g": number or null, "fat_g": number or null, "water_l": number or null}}
- recovery: {{"sleep_hours": number or null, "energy": int or null, "stress": int or null, "soreness": int or null}}
- conditioning: {{"activity": string, "distance_m": number or null, "duration_sec": int or null, "rpe": int or null}}
- bodyweight: {{"weight_lb": number}}

If the text doesn't clearly describe one of these, use log_type "unknown" with empty fields and explain why in summary.
Do not invent numbers that aren't stated or clearly implied.

Entry: "{payload.text}\""""

    raw = call_groq(prompt, max_tokens=400, json_mode=True)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Could not parse the AI's response")
    return QuickLogResult(**parsed)
