import React, { useState } from 'react';
import { Palette, Check, ChevronDown, Sun, Moon } from 'lucide-react';
import { useTheme, ThemeKey } from '../context/ThemeContext';
import { themes, themeCategories } from '../styles/themes';
import './ThemeSelector.css';

export function ThemeSelector() {
  const { theme: currentTheme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (themeKey: ThemeKey) => {
    setTheme(themeKey);
    setIsOpen(false);
  };

  const currentThemeData = availableThemes[currentTheme];

  return (
    <div className="theme-selector">
      <button
        className="theme-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Palette size={18} />
        <span className="theme-name">{currentThemeData.name}</span>
        <ChevronDown size={16} className={isOpen ? 'open' : ''} />
      </button>

      {isOpen && (
        <>
          <div className="theme-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="theme-selector-dropdown">
            {/* Dark Themes */}
            <div className="theme-category">
              <div className="theme-category-header">
                <Moon size={14} />
                <span>Dark Themes</span>
              </div>
              <div className="theme-options">
                {themeCategories.dark.map((key) => (
                  <ThemeOption
                    key={key}
                    themeKey={key}
                    isSelected={currentTheme === key}
                    onClick={() => handleSelect(key)}
                  />
                ))}
              </div>
            </div>

            {/* Light Themes */}
            <div className="theme-category">
              <div className="theme-category-header">
                <Sun size={14} />
                <span>Light Themes</span>
              </div>
              <div className="theme-options">
                {themeCategories.light.map((key) => (
                  <ThemeOption
                    key={key}
                    themeKey={key}
                    isSelected={currentTheme === key}
                    onClick={() => handleSelect(key)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ThemeOption({
  themeKey,
  isSelected,
  onClick,
}: {
  themeKey: ThemeKey;
  isSelected: boolean;
  onClick: () => void;
}) {
  const theme = themes[themeKey];
  const { colors } = theme;

  return (
    <button
      className={`theme-option ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={theme.name}
    >
      <div className="theme-preview">
        <div
          className="preview-bg"
          style={{ backgroundColor: colors.bgPrimary }}
        />
        <div
          className="preview-accent"
          style={{ backgroundColor: colors.accentPrimary }}
        />
        <div
          className="preview-text"
          style={{ backgroundColor: colors.textPrimary }}
        />
      </div>
      <span className="theme-option-name">{theme.name}</span>
      {isSelected && <Check size={16} className="check-icon" />}
    </button>
  );
}

// Compact version for navigation bar
export function ThemeSelectorCompact() {
  const { theme: currentTheme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (themeKey: ThemeKey) => {
    setTheme(themeKey);
    setIsOpen(false);
  };

  // Get a few popular themes for quick access
  const quickThemes: ThemeKey[] = ['dark', 'dracula', 'nord', 'light'];

  return (
    <div className="theme-selector-compact">
      {quickThemes.map((key) => (
        <button
          key={key}
          className={`theme-quick-btn ${currentTheme === key ? 'active' : ''}`}
          onClick={() => handleSelect(key)}
          title={availableThemes[key].name}
          style={{
            backgroundColor: availableThemes[key].colors.bgSecondary,
            borderColor: currentTheme === key ? availableThemes[key].colors.accentPrimary : availableThemes[key].colors.borderColor,
          }}
        >
          <div
            className="theme-color-dot"
            style={{ backgroundColor: availableThemes[key].colors.accentPrimary }}
          />
        </button>
      ))}
      <button
        className="theme-more-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="More themes"
      >
        <Palette size={16} />
      </button>

      {isOpen && (
        <>
          <div className="theme-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="theme-selector-dropdown-compact">
            <div className="theme-category">
              <div className="theme-category-header">
                <Moon size={14} />
                <span>Dark Themes</span>
              </div>
              <div className="theme-options">
                {themeCategories.dark.map((key) => (
                  <ThemeOption
                    key={key}
                    themeKey={key}
                    isSelected={currentTheme === key}
                    onClick={() => handleSelect(key)}
                  />
                ))}
              </div>
            </div>
            <div className="theme-category">
              <div className="theme-category-header">
                <Sun size={14} />
                <span>Light Themes</span>
              </div>
              <div className="theme-options">
                {themeCategories.light.map((key) => (
                  <ThemeOption
                    key={key}
                    themeKey={key}
                    isSelected={currentTheme === key}
                    onClick={() => handleSelect(key)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
