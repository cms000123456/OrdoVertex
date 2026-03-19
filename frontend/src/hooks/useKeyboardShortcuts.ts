import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // ? key - Open help
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        navigate('/help');
      }

      // Ctrl/Cmd + / - Open help (alternative)
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        navigate('/help');
      }

      // Escape - Go back to workflows from help
      if (event.key === 'Escape' && location.pathname === '/help') {
        navigate('/workflows');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);
}
