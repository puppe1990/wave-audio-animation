"""Pydantic models for database entities."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# --- User models ---

class UserCreate(BaseModel):
    """Payload for registering a new user."""
    email: str
    name: str | None = None
    password: str


class User(BaseModel):
    """User row returned from the database."""
    id: str
    email: str
    name: str | None = None
    password_hash: str | None = None
    created_at: datetime


# --- Export models ---

ExportFormat = Literal["mp4", "gif"]
ExportStyle = Literal["bars", "line", "mirror"]
ExportAspectRatio = Literal["16:9", "9:16", "1:1"]


class ExportCreate(BaseModel):
    """Payload for creating a new export."""
    user_id: str
    format: ExportFormat
    duration: int = Field(ge=1)
    style: ExportStyle
    aspect_ratio: ExportAspectRatio


class Export(BaseModel):
    """Export row returned from the database."""
    id: str
    user_id: str
    format: ExportFormat
    duration: int
    style: ExportStyle
    aspect_ratio: ExportAspectRatio
    created_at: datetime
