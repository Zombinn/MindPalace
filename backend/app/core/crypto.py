"""AES-256-GCM encryption for API keys."""
import os
from base64 import b64encode, b64decode
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import get_settings

settings = get_settings()

_SALT = b"mindpalace-v1-salt"


def _derive_key() -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=_SALT, iterations=600000)
    return kdf.derive(settings.MASTER_KEY.encode())


def encrypt(plaintext: str) -> bytes:
    key = _derive_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return b64encode(nonce + ct)


def decrypt(ciphertext: bytes) -> str:
    key = _derive_key()
    raw = b64decode(ciphertext)
    nonce, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode()
