from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.crypto import encrypt, decrypt
from app.core.ai_gateway import ai_gateway
from app.models.ai_config import AIProvider, AISceneRoute, PromptTemplate
from app.schemas import ProviderCreate, ProviderUpdate, SceneRouteCreate, TemplateUpdate
from app.api.helpers import get_or_404

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/providers")
async def list_providers(db: AsyncSession = Depends(get_db)):
    providers = (await db.execute(select(AIProvider))).scalars().all()
    return [{"id": p.id, "name": p.name, "base_url": p.base_url, "default_model": p.default_model, "is_default": p.is_default} for p in providers]


@router.post("/providers")
async def create_provider(data: ProviderCreate, db: AsyncSession = Depends(get_db)):
    p = AIProvider(name=data.name, base_url=data.base_url, api_key_enc=encrypt(data.api_key),
                   default_model=data.default_model, is_default=data.is_default)
    if data.is_default:
        others = (await db.execute(select(AIProvider).where(AIProvider.is_default == True))).scalars().all()
        for o in others:
            o.is_default = False
    db.add(p)
    await db.commit()
    await db.refresh(p)
    await ai_gateway.reload(db)
    return {"id": p.id, "name": p.name, "base_url": p.base_url}


@router.patch("/providers/{provider_id}")
async def update_provider(provider_id: int, data: ProviderUpdate, db: AsyncSession = Depends(get_db)):
    p = await get_or_404(db, AIProvider, provider_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        if k == "api_key" and v:
            setattr(p, "api_key_enc", encrypt(v))
        else:
            setattr(p, k, v)
    await db.commit()
    await ai_gateway.reload(db)
    return {"ok": True}


@router.post("/providers/{provider_id}/ping")
async def ping_provider(provider_id: int, db: AsyncSession = Depends(get_db)):
    p = await get_or_404(db, AIProvider, provider_id)
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=decrypt(p.api_key_enc), base_url=p.base_url)
        resp = await client.models.list()
        return {"ok": True, "models": [m.id for m in resp.data][:20]}
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {e}")


@router.get("/routes")
async def list_routes(db: AsyncSession = Depends(get_db)):
    routes = (await db.execute(select(AISceneRoute))).scalars().all()
    return [{"scene": r.scene, "provider_id": r.provider_id, "model": r.model, "temperature": r.temperature} for r in routes]


@router.put("/routes/{scene}")
async def set_route(scene: str, data: SceneRouteCreate, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(AISceneRoute).where(AISceneRoute.scene == scene))).scalar_one_or_none()
    if existing:
        existing.provider_id = data.provider_id
        existing.model = data.model
        existing.temperature = data.temperature
    else:
        r = AISceneRoute(scene=scene, provider_id=data.provider_id, model=data.model, temperature=data.temperature)
        db.add(r)
    await db.commit()
    await ai_gateway.reload(db)
    return {"ok": True}


@router.get("/templates")
async def list_templates(db: AsyncSession = Depends(get_db)):
    templates = (await db.execute(select(PromptTemplate))).scalars().all()
    return [{"id": t.id, "scene": t.scene, "name": t.name, "is_builtin": t.is_builtin, "content": t.content} for t in templates]


@router.patch("/templates/{template_id}")
async def update_template(template_id: int, data: TemplateUpdate, db: AsyncSession = Depends(get_db)):
    t = await get_or_404(db, PromptTemplate, template_id)
    t.content = data.content
    await db.commit()
    await ai_gateway.reload(db)
    return {"ok": True}
