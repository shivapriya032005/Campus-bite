import { createContext, useContext, useState, useCallback, useMemo } from 'react'

// Mirrors the backend limit per dish (MAX_QUANTITY_PER_ITEM)
const MAX_QUANTITY = 50

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [restaurantId, setRestaurantId] = useState(null)
  const [restaurantName, setRestaurantName] = useState('')

  const addItem = useCallback((item, restaurant) => {
    // If cart has items from a different restaurant, clear it first
    if (restaurantId && restaurantId !== restaurant.id) {
      if (!window.confirm(`Your cart has items from ${restaurantName}. Clear cart and add from ${restaurant.name}?`)) {
        return false
      }
      setItems([])
    }

    setRestaurantId(restaurant.id)
    setRestaurantName(restaurant.name)

    setItems(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id)
      if (existing) {
        return prev.map(i =>
          i.menu_item_id === item.id ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QUANTITY) } : i
        )
      }
      return [...prev, {
        menu_item_id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        image_url: item.image_url || null,
        category: item.category || null,
        quantity: 1,
      }]
    })
    return true
  }, [restaurantId, restaurantName])

  const updateQuantity = useCallback((menuItemId, quantity) => {
    if (quantity < 1) {
      removeItem(menuItemId)
      return
    }
    setItems(prev => prev.map(i =>
      i.menu_item_id === menuItemId ? { ...i, quantity: Math.min(quantity, MAX_QUANTITY) } : i
    ))
  }, [])

  const removeItem = useCallback((menuItemId) => {
    setItems(prev => {
      const next = prev.filter(i => i.menu_item_id !== menuItemId)
      if (next.length === 0) {
        setRestaurantId(null)
        setRestaurantName('')
      }
      return next
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setRestaurantId(null)
    setRestaurantName('')
  }, [])

  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items])
  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  // Stable value: consumers re-render only when the cart actually changes.
  const value = useMemo(() => ({
    items, restaurantId, restaurantName, total, count,
    addItem, updateQuantity, removeItem, clearCart,
  }), [items, restaurantId, restaurantName, total, count, addItem, updateQuantity, removeItem, clearCart])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

