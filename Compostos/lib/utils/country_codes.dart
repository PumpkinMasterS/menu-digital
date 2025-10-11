class CountryCode {
  final String name;
  final String code;
  final String dialCode;
  final String flag;

  const CountryCode({
    required this.name,
    required this.code,
    required this.dialCode,
    required this.flag,
  });
}

class CountryCodes {
  static const List<CountryCode> countries = [
    CountryCode(name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹'),
    CountryCode(name: 'Brasil', code: 'BR', dialCode: '+55', flag: '🇧🇷'),
    CountryCode(name: 'Angola', code: 'AO', dialCode: '+244', flag: '🇦🇴'),
    CountryCode(name: 'Cabo Verde', code: 'CV', dialCode: '+238', flag: '🇨🇻'),
    CountryCode(name: 'Guiné-Bissau', code: 'GW', dialCode: '+245', flag: '🇬🇼'),
    CountryCode(name: 'Moçambique', code: 'MZ', dialCode: '+258', flag: '🇲🇿'),
    CountryCode(name: 'São Tomé e Príncipe', code: 'ST', dialCode: '+239', flag: '🇸🇹'),
    CountryCode(name: 'Timor-Leste', code: 'TL', dialCode: '+670', flag: '🇹🇱'),
    CountryCode(name: 'Espanha', code: 'ES', dialCode: '+34', flag: '🇪🇸'),
    CountryCode(name: 'França', code: 'FR', dialCode: '+33', flag: '🇫🇷'),
    CountryCode(name: 'Alemanha', code: 'DE', dialCode: '+49', flag: '🇩🇪'),
    CountryCode(name: 'Reino Unido', code: 'GB', dialCode: '+44', flag: '🇬🇧'),
    CountryCode(name: 'Itália', code: 'IT', dialCode: '+39', flag: '🇮🇹'),
    CountryCode(name: 'Estados Unidos', code: 'US', dialCode: '+1', flag: '🇺🇸'),
    CountryCode(name: 'Canadá', code: 'CA', dialCode: '+1', flag: '🇨🇦'),
    CountryCode(name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷'),
    CountryCode(name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱'),
    CountryCode(name: 'Colômbia', code: 'CO', dialCode: '+57', flag: '🇨🇴'),
    CountryCode(name: 'México', code: 'MX', dialCode: '+52', flag: '🇲🇽'),
    CountryCode(name: 'Peru', code: 'PE', dialCode: '+51', flag: '🇵🇪'),
    CountryCode(name: 'Uruguai', code: 'UY', dialCode: '+598', flag: '🇺🇾'),
    CountryCode(name: 'Venezuela', code: 'VE', dialCode: '+58', flag: '🇻🇪'),
    CountryCode(name: 'Equador', code: 'EC', dialCode: '+593', flag: '🇪🇨'),
    CountryCode(name: 'Bolívia', code: 'BO', dialCode: '+591', flag: '🇧🇴'),
    CountryCode(name: 'Paraguai', code: 'PY', dialCode: '+595', flag: '🇵🇾'),
    CountryCode(name: 'Suíça', code: 'CH', dialCode: '+41', flag: '🇨🇭'),
    CountryCode(name: 'Áustria', code: 'AT', dialCode: '+43', flag: '🇦🇹'),
    CountryCode(name: 'Bélgica', code: 'BE', dialCode: '+32', flag: '🇧🇪'),
    CountryCode(name: 'Holanda', code: 'NL', dialCode: '+31', flag: '🇳🇱'),
    CountryCode(name: 'Luxemburgo', code: 'LU', dialCode: '+352', flag: '🇱🇺'),
  ];

  static CountryCode get defaultCountry => countries.first; // Portugal como padrão

  static CountryCode? findByCode(String code) {
    try {
      return countries.firstWhere((country) => country.code == code);
    } catch (e) {
      return null;
    }
  }

  static CountryCode? findByDialCode(String dialCode) {
    try {
      return countries.firstWhere((country) => country.dialCode == dialCode);
    } catch (e) {
      return null;
    }
  }
}