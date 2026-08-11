import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BodyMapFilter, { ORGAN_ZONES } from './BodyMapFilter';

describe('BodyMapFilter Component', () => {
  const mockToggleSpecialty = jest.fn();
  const mockClearAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the interactive body map title and organ chips', () => {
    render(
      <BodyMapFilter
        selectedSpecialties={[]}
        onToggleSpecialty={mockToggleSpecialty}
        onClearAll={mockClearAll}
      />
    );

    expect(screen.getByText(/Interactive Body Map/i)).toBeInTheDocument();
    expect(screen.getByText(/Click an organ to filter internships/i)).toBeInTheDocument();
    
    // Check that organ chips are present
    expect(screen.getByText(/Neurology/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiology/i)).toBeInTheDocument();
    expect(screen.getByText(/Orthopedics/i)).toBeInTheDocument();
    expect(screen.getByText(/Pulmonology/i)).toBeInTheDocument();
  });

  it('calls onToggleSpecialty when an organ SVG element is clicked', () => {
    render(
      <BodyMapFilter
        selectedSpecialties={[]}
        onToggleSpecialty={mockToggleSpecialty}
        onClearAll={mockClearAll}
      />
    );

    // Find heart organ zone by test id
    const heartOrgan = screen.getByTestId('organ-heart');
    fireEvent.click(heartOrgan);

    expect(mockToggleSpecialty).toHaveBeenCalledTimes(1);
    expect(mockToggleSpecialty).toHaveBeenCalledWith('cardiology');
  });

  it('calls onToggleSpecialty when an organ chip is clicked', () => {
    render(
      <BodyMapFilter
        selectedSpecialties={[]}
        onToggleSpecialty={mockToggleSpecialty}
        onClearAll={mockClearAll}
      />
    );

    const brainChip = screen.getByText(/🧠 Neurology/i);
    fireEvent.click(brainChip);

    expect(mockToggleSpecialty).toHaveBeenCalledWith('neurology');
  });

  it('renders reset button when selectedSpecialties is non-empty and handles clear action', () => {
    render(
      <BodyMapFilter
        selectedSpecialties={['cardiology', 'neurology']}
        onToggleSpecialty={mockToggleSpecialty}
        onClearAll={mockClearAll}
      />
    );

    const resetButton = screen.getByRole('button', { name: /Reset \(2\)/i });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  it('displays organ info on mouse hover', () => {
    render(
      <BodyMapFilter
        selectedSpecialties={[]}
        onToggleSpecialty={mockToggleSpecialty}
        onClearAll={mockClearAll}
      />
    );

    const heartOrgan = screen.getByTestId('organ-heart');
    fireEvent.mouseEnter(heartOrgan);

    expect(screen.getByText(/Heart & Cardiovascular System/i)).toBeInTheDocument();

    fireEvent.mouseLeave(heartOrgan);
    expect(screen.queryByText(/Heart & Cardiovascular System/i)).not.toBeInTheDocument();
  });
});
