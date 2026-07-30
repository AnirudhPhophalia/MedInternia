import React from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Divider,
  Paper,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface JobFiltersProps {
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  specialties: string[];
  onSpecialtiesChange: (s: string[]) => void;
  experience: string;
  onExperienceChange: (e: string) => void;
  isRemote: boolean;
  onRemoteChange: (r: boolean) => void;
  visaSponsorship: boolean;
  onVisaChange: (v: boolean) => void;
  location: string;
  onLocationChange: (l: string) => void;
  onClear: () => void;
}

export const SPECIALTY_OPTIONS = [
  { label: 'Surgery', value: 'surgery' },
  { label: 'Nursing', value: 'nursing' },
  { label: 'General Practice', value: 'general-practice' },
  { label: 'General Medicine', value: 'general' },
  { label: 'Cardiology', value: 'cardiology' },
  { label: 'Neurology', value: 'neurology' },
  { label: 'Oncology', value: 'oncology' },
  { label: 'Pediatrics', value: 'pediatrics' },
  { label: 'Psychiatry', value: 'psychiatry' },
  { label: 'Radiology', value: 'radiology' },
  { label: 'Emergency', value: 'emergency' },
  { label: 'Internal Medicine', value: 'internal-medicine' }
];

export default function JobFilters({
  searchQuery = '',
  onSearchQueryChange,
  specialties,
  onSpecialtiesChange,
  experience,
  onExperienceChange,
  isRemote,
  onRemoteChange,
  visaSponsorship,
  onVisaChange,
  location,
  onLocationChange,
  onClear
}: JobFiltersProps) {

  const handleSpecialtyToggle = (specValue: string) => {
    const val = specValue.toLowerCase();
    if (specialties.includes(val)) {
      onSpecialtiesChange(specialties.filter(s => s !== val));
    } else {
      onSpecialtiesChange([...specialties, val]);
    }
  };

  const selectedDropdownValue = specialties.length === 1 ? specialties[0] : '';

  return (
    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Filters</Typography>
        <Button size="small" onClick={onClear} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Clear All
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Task 1: Search bar for internship title or description */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
        Search Internship
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder="Search title or description..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange && onSearchQueryChange(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Divider sx={{ mb: 3 }} />

      {/* Task 2: Dropdown filter for Specialty */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
        Specialty Dropdown
      </Typography>
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel id="specialty-dropdown-label">Select Specialty</InputLabel>
        <Select
          labelId="specialty-dropdown-label"
          id="specialty-dropdown-select"
          value={selectedDropdownValue}
          label="Select Specialty"
          onChange={(e) => {
            const val = e.target.value;
            if (!val) {
              onSpecialtiesChange([]);
            } else {
              onSpecialtiesChange([val]);
            }
          }}
        >
          <MenuItem value=""><em>All Specialties</em></MenuItem>
          {SPECIALTY_OPTIONS.map((spec) => (
            <MenuItem key={spec.value} value={spec.value}>
              {spec.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Or select multiple specialties:
      </Typography>
      <FormGroup sx={{ mb: 3, maxHeight: 180, overflowY: 'auto', pr: 1 }}>
        {SPECIALTY_OPTIONS.map((spec) => (
          <FormControlLabel
            key={spec.value}
            control={
              <Checkbox 
                size="small" 
                checked={specialties.includes(spec.value)}
                onChange={() => handleSpecialtyToggle(spec.value)}
              />
            }
            label={<Typography variant="body2">{spec.label}</Typography>}
          />
        ))}
      </FormGroup>

      <Divider sx={{ mb: 3 }} />

      {/* Task 3: Location filter for City or State */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
        Location Filter
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder="Filter by city or state"
        value={location}
        onChange={(e) => onLocationChange(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
        Max Experience Required
      </Typography>
      <RadioGroup
        value={experience}
        onChange={(e) => onExperienceChange(e.target.value)}
        sx={{ mb: 3 }}
      >
        <FormControlLabel value="" control={<Radio size="small" />} label={<Typography variant="body2">Any Experience</Typography>} />
        <FormControlLabel value="1" control={<Radio size="small" />} label={<Typography variant="body2">Entry Level (0-1 yrs)</Typography>} />
        <FormControlLabel value="3" control={<Radio size="small" />} label={<Typography variant="body2">Mid Level (1-3 yrs)</Typography>} />
        <FormControlLabel value="5" control={<Radio size="small" />} label={<Typography variant="body2">Senior Level (5+ yrs)</Typography>} />
      </RadioGroup>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
        Work Model
      </Typography>
      <FormGroup sx={{ mb: 3 }}>
        <FormControlLabel
          control={<Checkbox size="small" checked={isRemote} onChange={(e) => onRemoteChange(e.target.checked)} />}
          label={<Typography variant="body2">Remote Only</Typography>}
        />
      </FormGroup>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
        Visa Sponsorship
      </Typography>
      <FormGroup>
        <FormControlLabel
          control={<Switch size="small" checked={visaSponsorship} onChange={(e) => onVisaChange(e.target.checked)} color="primary" />}
          label={<Typography variant="body2">Offers Sponsorship</Typography>}
        />
      </FormGroup>
    </Paper>
  );
}
