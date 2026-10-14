'use client';

import { Desktop, DeviceTablet, DeviceMobile } from '@phosphor-icons/react';

export type Device = 'desktop' | 'tablet' | 'mobile';

interface DeviceConfig {
  id: Device;
  label: string;
  icon: React.ReactNode;
  width: number;
  height: number;
}

const DEVICES: DeviceConfig[] = [
  { id: 'desktop', label: 'Desktop', icon: <Desktop size={16} weight="regular" />, width: 1280, height: 800 },
  { id: 'tablet', label: 'Tablet', icon: <DeviceTablet size={16} weight="regular" />, width: 768, height: 1024 },
  { id: 'mobile', label: 'Mobile', icon: <DeviceMobile size={16} weight="regular" />, width: 375, height: 667 },
];

interface DeviceToggleProps {
  device: Device;
  onChange: (device: Device) => void;
}

export function DeviceToggle({ device, onChange }: DeviceToggleProps) {
  return (
    <div className="device-toggle" role="group" aria-label="Preview viewport">
      {DEVICES.map((d) => (
        <button
          key={d.id}
          type="button"
          className={`device-toggle-btn ${device === d.id ? 'active' : ''}`}
          onClick={() => onChange(d.id)}
          aria-pressed={device === d.id}
          aria-label={`${d.label} view (${d.width}×${d.height})`}
          title={`${d.label} (${d.width}×${d.height})`}
        >
          {d.icon}
          <span className="hide-mobile">{d.label}</span>
        </button>
      ))}
    </div>
  );
}

export function getDeviceSize(device: Device): { width: number; height: number } {
  const found = DEVICES.find((d) => d.id === device);
  return found ? { width: found.width, height: found.height } : { width: 1280, height: 800 };
}

export const DEVICE_OPTIONS = DEVICES;
