import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, selectedValues, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    let displayText = placeholder;
    if (selectedValues.length === 1) {
        const option = options.find(o => o.value === selectedValues[0]);
        if (option) displayText = option.label;
    } else if (selectedValues.length > 1) {
        displayText = `${selectedValues.length} selected`;
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 min-h-[42px] text-left text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
                <span className="truncate pr-2">{displayText}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 py-1 bg-[#1a2133] border border-white/10 rounded-lg shadow-xl shadow-black/40 max-h-60 overflow-y-auto">
                    {options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                onClick={() => toggleOption(option.value)}
                                className="flex items-center px-4 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition-colors"
                            >
                                <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                    {isSelected && <Check size={12} className="text-white" />}
                                </div>
                                <span className="truncate">{option.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
