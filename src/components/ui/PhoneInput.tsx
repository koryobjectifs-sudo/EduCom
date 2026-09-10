import React from 'react';
import PhoneInputReact, { isPossiblePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  id?: string;
  defaultCountry?: any;
}

export function PhoneInput({ 
  value, 
  onChange, 
  label, 
  placeholder, 
  required, 
  error, 
  id,
  defaultCountry = "SN"
}: PhoneInputProps) {
  const isError = error || (value && !isPossiblePhoneNumber(value)) ? "Numéro invalide" : undefined;

  return (
    <div className="space-y-2 w-full text-left">
      {label && (
        <label htmlFor={id} className="block text-[13px] font-semibold tracking-wide text-text">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className={`relative flex items-center rounded-control border ${isError ? 'border-danger/50 bg-danger/5' : 'border-rule bg-surface'} px-3 py-2.5 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20`}>
        <PhoneInputReact
          id={id}
          international
          defaultCountry={defaultCountry}
          value={value}
          onChange={(v) => onChange(v as string)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] outline-none PhoneInput-custom"
        />
      </div>
      {isError && (
        <p className="text-[12px] font-medium text-danger">{isError}</p>
      )}
    </div>
  );
}
