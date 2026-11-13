import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Utensils, Search, Image as ImageIcon } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
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
      toast.error(getErrorMessage(err, 'Failed to save menu item'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to remove "${item.name}" from your menu?`)) return;
    try {
      await api.delete(`/menu-items/${item.id}`);
      toast.success(`Removed ${item.name}`);
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
      toast.error('Failed to update stock status');
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
            Menu Catalog
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Menu Offerings ({items.length})
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Publish new dishes, adjust prices, and toggle in-stock availability for students.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Dish
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by dish name or category..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Menu Cards */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No dishes in catalog"
          description="Build your restaurant's digital presence by adding your first signature menu item."
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
            <Card key={item.id} className="flex flex-col justify-between overflow-hidden !p-0">
              <div>
                <div className="h-44 bg-gray-800 overflow-hidden relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1A222E]">
                      <Utensils className="w-10 h-10 text-gray-600" />
                    </div>
                  )}

                  <span
                    className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      item.is_available
                        ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800'
                        : 'bg-red-950/90 text-red-400 border border-red-800'
                    }`}
                  >
                    {item.is_available ? 'Available' : 'Sold Out'}
                  </span>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-base font-bold text-white tracking-tight">
                      {item.name}
                    </h3>
                    <span className="font-bold text-[#C5A46D] text-base shrink-0">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>

                  {item.category && (
                    <span className="inline-block text-[11px] font-medium text-gray-400 bg-[#1A222E] px-2.5 py-0.5 rounded-full border border-gray-800">
                      {item.category}
                    </span>
                  )}

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleAvailability(item)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                      item.is_available
                        ? 'border-amber-600/50 text-amber-400 hover:bg-amber-950/30'
                        : 'border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/30'
                    }`}
                  >
                    {item.is_available ? 'Mark Sold Out' : 'Mark In Stock'}
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-[#1A222E] hover:bg-gray-750 border border-gray-750 transition-colors cursor-pointer"
                      title="Edit item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg bg-[#1A222E] hover:bg-gray-750 border border-gray-750 transition-colors cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Dish Details' : 'Add Dish to Menu'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Dish Name *"
            placeholder="e.g. Grass-Fed Angus Bacon Burger"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price ($) *"
              type="number"
              step="0.01"
              placeholder="12.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Input
              label="Category"
              placeholder="e.g. Burgers, Bowls, Sides"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <Input
            label="Food Photography URL"
            icon={ImageIcon}
            placeholder="https://images.unsplash.com/photo-..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
              Description & Ingredients
            </label>
            <textarea
              rows={2}
              placeholder="Flavor notes, allergen details, and preparation..."
              className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none"
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
              className="rounded bg-[#1A222E] border-gray-750 text-[#C5A46D] focus:ring-[#C5A46D]"
            />
            <label htmlFor="is_avail" className="text-xs text-gray-300 cursor-pointer">
              Dish is currently available in the kitchen
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editingItem ? 'Save Modifications' : 'Publish Dish'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
