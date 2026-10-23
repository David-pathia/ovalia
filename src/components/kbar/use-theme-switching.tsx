import { useRegisterActions } from 'kbar';
import { useTheme } from 'next-themes';

const useThemeSwitching = () => {
  const { theme, setTheme } = useTheme();

  const themeActions = [
    {
      id: 'toggleDarkLight',
      name: 'Basculer fond forêt / fond ivoire',
      shortcut: ['d', 'd'],
      section: 'Affichage',
      perform: () => setTheme(theme === 'light' ? 'dark' : 'light')
    },
    {
      id: 'setDarkTheme',
      name: 'Fond vert forêt',
      section: 'Affichage',
      perform: () => setTheme('dark')
    },
    {
      id: 'setLightTheme',
      name: 'Fond ivoire',
      section: 'Affichage',
      perform: () => setTheme('light')
    }
  ];

  useRegisterActions(themeActions, [theme]);
};

export default useThemeSwitching;
