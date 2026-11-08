import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Utensils, Search } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function MenuManagementPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const toast = useToast();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/menu-items/owner/all');
      setItems(res.data.items || []);
    } catch (err) {
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setDesc('');
    setPrice('');
    setCategory('');
    setImageUrl('');
    setIsAvailable(true);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name);
    setDesc(item.description || '');
    setPrice(String(item.price));
    setCategory(item.category || '');
    setImageUrl(item.image_url || '');
    setIsAvailable(item.is_available);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error('Name and price are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: desc.trim() || null,
        price: parseFloat(price),
        category: category.trim() || null,
        image_url: imageUrl.trim() || null,
        is_available: isAvailable,
      };

      if (editingItem) {
        await api.put(`/menu-items/${editingItem.id}`, payload);
        toast.success(`Updated ${payload.name}`);
      } else {
        await api.post('/menu-items', payload);
        toast.success(`Added ${payload.name} to menu`);
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await api.delete(`/menu-items/${item.id}`);
      toast.success(`Deleted ${item.name}`);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu-items/${item.id}`, { is_available: !item.is_available });
      setItems(items.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)));
      toast.success(`${item.name} is now ${!item.is_available ? 'Available' : 'Unavailable'}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Menu Management</h1>
          <p className="text-gray-400 mt-1">Add, update, or remove dishes offered by your restaurant</p>
        </div>

        <div className="flex gap-3">
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Menu Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Filter menu items..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Items Table/Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No menu items found"
          description="Click 'Add Menu Item' to start building your restaurant's menu!"
          action={
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Dish
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between">
              <div>
                <div className="h-40 bg-gray-750 rounded-lg overflow-hidden relative mb-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Utensils className="w-10 h-10 text-gray-600" />
                    </div>
                  )}
                  <span
                    className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.is_available
                        ? 'bg-green-950/80 text-green-400 border border-green-800'
                        : 'bg-red-950/80 text-red-400 border border-red-800'
                    }`}
                  >
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-white text-base">{item.name}</h3>
                  <span className="text-[#C5A46D] font-bold text-base shrink-0">
                    ${Number(item.price).toFixed(2)}
                  </span>
                </div>

                {item.category && (
                  <span className="text-[11px] bg-gray-750 text-gray-400 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                )}
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                  {item.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-750 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleAvailability(item)}
                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                    item.is_available
                      ? 'border-yellow-600/50 text-yellow-400 hover:bg-yellow-950/30'
                      : 'border-green-600/50 text-green-400 hover:bg-green-950/30'
                  }`}
                >
                  {item.is_available ? 'Mark Sold Out' : 'Mark In Stock'}
                </button>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-gray-400 hover:text-white rounded bg-gray-750 hover:bg-gray-700"
                    title="Edit item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-gray-400 hover:text-red-400 rounded bg-gray-750 hover:bg-gray-700"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Dish Name *"
            placeholder="e.g. Classic Campus Cheeseburger"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price ($) *"
              type="number"
              step="0.01"
              placeholder="9.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Input
              label="Category"
              placeholder="e.g. Mains, Sides, Drinks"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <Input
            label="Image URL"
            placeholder="https://example.com/dish.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Ingredients, preparation, flavor profile..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_avail"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="rounded bg-gray-900 border-gray-700 text-[#C5A46D] focus:ring-[#C5A46D]"
            />
            <label htmlFor="is_avail" className="text-sm text-gray-300">
              Item is currently available for ordering
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
