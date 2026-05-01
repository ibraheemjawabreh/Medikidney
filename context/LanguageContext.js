import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import translations from '../translations';

const LANG_KEY = 'app_language';

const LanguageContext = createContext({
  lang: 'ar',
  t: translations.ar,
  toggleLanguage: () => {},
  isRTL: true,
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('ar');

  useEffect(() => {
    // Load saved language on app start
    AsyncStorage.getItem(LANG_KEY).then(saved => {
      if (saved && (saved === 'ar' || saved === 'en')) {
        setLang(saved);
      }
    });
  }, []);

  const toggleLanguage = async () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    await AsyncStorage.setItem(LANG_KEY, newLang);
    setLang(newLang);
  };

  const t = translations[lang];
  const isRTL = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
