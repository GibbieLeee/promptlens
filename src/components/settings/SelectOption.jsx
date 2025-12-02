import React from "react";

export default function SelectOption({ value, options, onChange, label }) {
  return (
    <div className="settings-select">
      {label && <span className="settings-select-label">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="settings-select-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

