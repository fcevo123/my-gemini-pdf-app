import React from 'react';
import { SignatureSettings, PageDimensions } from '../types';

interface SettingsPanelProps {
  settings: SignatureSettings;
  onSettingsChange: (settings: SignatureSettings) => void;
  pageDimensions: PageDimensions;
  totalPages: number;
}

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onNumberChange: (value: number) => void;
}

const SettingSlider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, onNumberChange }) => {
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onNumberChange(newValue);
    }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-300">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={Math.round(value)}
              onChange={handleNumberInput}
              className="w-16 text-xs bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-center"
            />
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
    </div>
  );
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, pageDimensions, totalPages }) => {
  const handleSettingsChange = (newSettings: Partial<SignatureSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    if (totalPages > 0 && updatedSettings.startPage > totalPages) {
        updatedSettings.startPage = totalPages;
    }
    onSettingsChange(updatedSettings);
  };

  const handleFieldChange = (field: keyof SignatureSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSettingsChange({ [field]: Number(e.target.value) });
  };

  const handleNumberChange = (field: keyof SignatureSettings) => (value: number) => {
    handleSettingsChange({ [field]: value });
  };
  
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = Number(e.target.value);
    if (!settings.signatureAspectRatio) return;
    handleSettingsChange({
      width: newWidth,
      height: newWidth / settings.signatureAspectRatio,
    });
  };


  return (
    <div className="bg-gray-800 p-4 rounded-lg flex-grow">
      <h2 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">簽名設定</h2>
      <div className="space-y-4">
        <SettingSlider 
            label="X 軸位置 (從左邊算起)"
            value={settings.x}
            min={0}
            max={pageDimensions.width}
            step={1}
            onChange={handleFieldChange('x')}
            onNumberChange={handleNumberChange('x')}
        />
        <SettingSlider 
            label="Y 軸位置 (從底部算起)"
            value={settings.y}
            min={0}
            max={pageDimensions.height}
            step={1}
            onChange={handleFieldChange('y')}
            onNumberChange={handleNumberChange('y')}
        />
        <SettingSlider 
            label="簽名大小"
            value={settings.width}
            min={10}
            max={pageDimensions.width}
            step={1}
            onChange={handleSizeChange}
            onNumberChange={(value) => {
              if (!settings.signatureAspectRatio) return;
              handleSettingsChange({
                width: value,
                height: value / settings.signatureAspectRatio,
              });
            }}
        />
      </div>
      <h3 className="text-md font-semibold mt-6 mb-3 border-b border-gray-700 pb-2">頁面設定</h3>
      <div className="space-y-4">
         <SettingSlider 
            label="從第幾頁開始簽名"
            value={settings.startPage}
            min={1}
            max={totalPages > 0 ? totalPages : 1}
            step={1}
            onChange={handleFieldChange('startPage')}
            onNumberChange={handleNumberChange('startPage')}
        />
        <SettingSlider 
            label="每隔 N 頁簽名 (間隔)"
            value={settings.pageInterval}
            min={1}
            max={totalPages > 0 ? totalPages : 10}
            step={1}
            onChange={handleFieldChange('pageInterval')}
            onNumberChange={handleNumberChange('pageInterval')}
        />
      </div>
    </div>
  );
};