"""Pydantic schemas for restaurant operations."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class RestaurantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    cuisine_type: str | None = Field(None, max_length=100)
    address: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    image_url: str | None = Field(None, max_length=500)


class RestaurantUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    cuisine_type: str | None = Field(None, max_length=100)
    address: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    image_url: str | None = Field(None, max_length=500)
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class RestaurantResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: str | None
    cuisine_type: str | None
    address: str | None
    phone: str | None
    image_url: str | None
    avg_rating: Decimal
    total_reviews: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RestaurantListResponse(BaseModel):
    restaurants: list[RestaurantResponse]
    total: int
    page: int
    per_page: int

