import { useState, useEffect } from 'react';
import { MapPin, Check, Building2, BookOpen, GraduationCap, Coffee, X } from 'lucide-react';
import Modal from '../common/Modal';

const CAMPUS_LOCATIONS = [
  { id: 'north-dorm', name: 'North Quad Dorm', detail: 'Hall C, Room 314', icon: Building2 },
  { id: 'south-apts', name: 'South Campus Apartments', detail: 'Building B, Floor 2', icon: Building2 },
  { id: 'main-library', name: 'William Knox Library', detail: '2nd Floor Quiet Study Zone', icon: BookOpen },
  { id: 'eng-quad', name: 'Engineering Quad Plaza', detail: 'Tower 1 Entrance Breezeway', icon: GraduationCap },
  { id: 'student-union', name: 'Student Union Lounge', detail: 'Ground Floor Atrium', icon: Coffee },
];

export default function LocationModal({ isOpen, onClose, currentLocation, onSelectLocation }) {
  const [selectedId, setSelectedId] = useState('north-dorm');
  const [customLocation, setCustomLocation] = useState('');

  useEffect(() => {
    const matched = CAMPUS_LOCATIONS.find((l) => l.detail === currentLocation || l.name === currentLocation);
    if (matched) {
      setSelectedId(matched.id);
    }
  }, [currentLocation]);

  const handleSelect = (loc) => {
    setSelectedId(loc.id);
    onSelectLocation(`${loc.name}, ${loc.detail}`);
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customLocation.trim()) {
      onSelectLocation(customLocation.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Delivery Location" size="md">
      <div className="space-y-4">
        <p className="text-xs text-gray-400">
          Select your current campus building or dorm for accurate courier drop-off estimates.
        </p>

        <div className="space-y-2">
          {CAMPUS_LOCATIONS.map((loc) => {
            const Icon = loc.icon;
            const isSelected = selectedId === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelect(loc)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#C5A46D] bg-[#C5A46D]/10 ring-1 ring-[#C5A46D]/30'
                    : 'border-[#1E2633] bg-[#111827] hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#C5A46D]/20 text-[#C5A46D]' : 'bg-[#1A222E] text-gray-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {loc.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">{loc.detail}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#C5A46D]" />}
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[#1E2633]">
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
              Or Enter Custom Campus Spot
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Science Lab 402, Hall B"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="flex-1 bg-[#111827] border border-[#1E2633] focus:border-[#C5A46D] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#C5A46D] hover:bg-[#b08e58] text-gray-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Set
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

