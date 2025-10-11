import { useLanguage } from '../contexts/LanguageContext.jsx';

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();
  
  return (
    <button
      onClick={toggleLanguage}
      className="relative inline-flex items-center h-8 w-16 rounded-full bg-slate-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:bg-slate-300"
      aria-label={`Switch to ${language === 'pt' ? 'English' : 'Portuguese'}`}
    >
      {/* Background slider */}
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
          language === 'en' ? 'translate-x-8' : 'translate-x-1'
        }`}
      />
      
      {/* PT label */}
      <span
        className={`absolute left-1.5 text-xs font-medium transition-colors duration-200 ${
          language === 'pt' ? 'text-blue-600' : 'text-slate-500'
        }`}
      >
        PT
      </span>
      
      {/* EN label */}
      <span
        className={`absolute right-1.5 text-xs font-medium transition-colors duration-200 ${
          language === 'en' ? 'text-blue-600' : 'text-slate-500'
        }`}
      >
        EN
      </span>
    </button>
  );
};

export default LanguageToggle;