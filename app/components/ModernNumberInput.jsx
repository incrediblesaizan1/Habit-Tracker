"use client";
import React from "react";

export default function ModernNumberInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = "",
  style = {},
  min,
  max,
  step = 1,
  required,
  autoFocus
}) {
  const handleUp = (e) => {
    e.preventDefault();
    const current = parseFloat(value) || 0;
    const numStep = parseFloat(step) || 1;
    let next = current + numStep;
    if (typeof max !== "undefined" && max !== null && next > parseFloat(max)) {
      next = parseFloat(max);
    }
    // format to avoid float precision issues if using decimals
    const isFloat = numStep % 1 !== 0;
    const formatted = isFloat ? Number(next.toFixed(2)) : next;
    
    onChange({ target: { value: String(formatted) } });
  };

  const handleDown = (e) => {
    e.preventDefault();
    const current = parseFloat(value) || 0;
    const numStep = parseFloat(step) || 1;
    let next = current - numStep;
    if (typeof min !== "undefined" && min !== null && next < parseFloat(min)) {
      next = parseFloat(min);
    }
    const isFloat = numStep % 1 !== 0;
    const formatted = isFloat ? Number(next.toFixed(2)) : next;
    
    onChange({ target: { value: String(formatted) } });
  };

  return (
    <div className={`modern-number-wrapper ${className}`} style={style}>
      <input
        type="number"
        className="modern-number-input"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
        autoFocus={autoFocus}
      />
      <div className="modern-spin-btns">
        <button type="button" className="modern-spin-btn up" tabIndex="-1" onClick={handleUp}>
          <svg viewBox="0 0 24 24"><path d="M12 8l6 6H6z" /></svg>
        </button>
        <button type="button" className="modern-spin-btn down" tabIndex="-1" onClick={handleDown}>
          <svg viewBox="0 0 24 24"><path d="M12 16l-6-6h12z" /></svg>
        </button>
      </div>
    </div>
  );
}
