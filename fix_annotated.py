import re

path = r"c:\progetti\Ggameplatform\Ggameplatform\backend\app\routers\admin.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# 1. Add Annotated to typing import
content = content.replace(
    "from typing import Dict, List, Any, Optional",
    "from typing import Annotated, Dict, List, Any, Optional"
)

# 2. Add DbSession alias right after get_db() function
content = content.replace(
    'def get_db():\n    """Get database session as dependency"""\n    with get_db_session() as session:\n        yield session\n',
    'def get_db():\n    """Get database session as dependency"""\n    with get_db_session() as session:\n        yield session\n\nDbSession = Annotated[Session, Depends(get_db)]\n'
)

# 3. Fix verify_token_from_cookie: Cookie dependency to Annotated
content = content.replace(
    "    admin_token: Optional[str] = Cookie(None),\n    db: Session = Depends(get_db)",
    "    admin_token: Annotated[Optional[str], Cookie(None)],\n    db: DbSession"
)

# 4. Add CurrentUser alias after verify_token_from_cookie returns
content = content.replace(
    '    return username\n\n@router.get("/login"',
    '    return username\n\nCurrentUser = Annotated[str, Depends(verify_token_from_cookie)]\n\n@router.get("/login"'
)

# 5. Fix verify_admin: Header dependency to Annotated
content = content.replace(
    "def verify_admin(x_api_key: Optional[str] = Header(None), request: Request = None):",
    "def verify_admin(x_api_key: Annotated[Optional[str], Header(None)] = None, request: Request = None):"
)

# 6. Replace all remaining db: Session = Depends(get_db)
content = content.replace("db: Session = Depends(get_db)", "db: DbSession")

# 7. Replace all username: str = Depends(verify_token_from_cookie)
content = content.replace("username: str = Depends(verify_token_from_cookie)", "username: CurrentUser")

changed = content.count("DbSession") + content.count("CurrentUser = Annotated")
print(f"DbSession occurrences: {content.count('DbSession')}")
print(f"CurrentUser occurrences: {content.count('CurrentUser')}")
print(f"Remaining old patterns: {content.count('= Depends(get_db)')}")
print(f"Remaining old username patterns: {content.count('= Depends(verify_token_from_cookie)')}")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
