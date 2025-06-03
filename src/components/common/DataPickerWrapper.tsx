import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { TextField, TextFieldProps } from '@mui/material';

interface DatePickerWrapperProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  fullWidth?: boolean;
  required?: boolean;
  helperText?: string;
  textFieldProps?: Partial<TextFieldProps>;
}

/**
 * Composant wrapper pour le DatePicker de MUI qui gère la configuration de l'adaptateur
 * Ceci facilite l'utilisation cohérente des DatePickers dans l'application
 */
const DatePickerWrapper: React.FC<DatePickerWrapperProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  fullWidth = true,
  required = false,
  helperText,
  textFieldProps = {}
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <DatePicker
        label={label}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth,
            required,
            helperText,
            ...textFieldProps
          }
        }}
      />
    </LocalizationProvider>
  );
};

export default DatePickerWrapper;