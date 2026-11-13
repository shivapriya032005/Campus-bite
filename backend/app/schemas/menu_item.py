"""Pydantic schemas for menu item operations."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    category: str | None = Field(None, max_length=100)
    image_url: str | None = Field(None, max_length=500)
    is_available: bool = True


class MenuItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(None, gt=0, max_digits=10, decimal_places=2)
    category: str | None = Field(None, max_length=100)
    image_url: str | None = Field(None, max_length=500)
    is_available: bool | None = None


class MenuItemResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    description: str | None
    price: Decimal
    category: str | None
    image_url: str | None
    is_available: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MenuItemListResponse(BaseModel):
    items: list[MenuItemResponse]
    total: int

