import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:compostos/utils/country_codes.dart';

class CountryCodeDropdown extends StatelessWidget {
  final CountryCode selectedCountry;
  final ValueChanged<CountryCode?> onChanged;
  final bool enabled;

  const CountryCodeDropdown({
    super.key,
    required this.selectedCountry,
    required this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade400),
        borderRadius: BorderRadius.circular(4),
        color: enabled ? Colors.white : Colors.grey.shade200,
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<CountryCode>(
          value: selectedCountry,
          onChanged: enabled ? onChanged : null,
          isDense: true,
          isExpanded: false,
          icon: const Icon(Icons.arrow_drop_down),
          items: CountryCodes.countries.map((CountryCode country) {
            return DropdownMenuItem<CountryCode>(
              value: country,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 24,
                    child: Text(
                      country.flag,
                      style: const TextStyle(fontSize: 18),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    country.dialCode,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class PhoneInputWithCountryCode extends StatefulWidget {
  final TextEditingController controller;
  final String? Function(String?)? validator;
  final String labelText;
  final String hintText;
  final bool enabled;
  final CountryCode? initialCountry;
  final ValueChanged<CountryCode>? onCountryChanged;

  const PhoneInputWithCountryCode({
    super.key,
    required this.controller,
    this.validator,
    this.labelText = 'Telefone',
    this.hintText = '999999999',
    this.enabled = true,
    this.initialCountry,
    this.onCountryChanged,
  });

  @override
  State<PhoneInputWithCountryCode> createState() => _PhoneInputWithCountryCodeState();
}

class _PhoneInputWithCountryCodeState extends State<PhoneInputWithCountryCode> {
  late CountryCode _selectedCountry;

  @override
  void initState() {
    super.initState();
    _selectedCountry = widget.initialCountry ?? CountryCodes.defaultCountry;
  }

  void _onCountryChanged(CountryCode? country) {
    if (country != null) {
      setState(() {
        _selectedCountry = country;
      });
      widget.onCountryChanged?.call(country);
    }
  }

  String? _validatePhone(String? value) {
    if (value == null || value.isEmpty) {
      return 'Por favor, digite seu telefone';
    }

    // Remove espaços e caracteres especiais
    final cleanPhone = value.replaceAll(RegExp(r'[^0-9]'), '');

    // Validação específica por país
    switch (_selectedCountry.code) {
      case 'PT': // Portugal
        if (cleanPhone.length != 9) {
          return 'Telefone português deve ter 9 dígitos';
        }
        if (!cleanPhone.startsWith('9') && !cleanPhone.startsWith('2')) {
          return 'Telefone português inválido';
        }
        break;
      case 'BR': // Brasil
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
          return 'Telefone brasileiro deve ter 10 ou 11 dígitos';
        }
        break;
      default:
        if (cleanPhone.length < 7 || cleanPhone.length > 15) {
          return 'Telefone inválido';
        }
    }

    // Chama validador customizado se fornecido
    return widget.validator?.call(value);
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      keyboardType: TextInputType.phone,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      enabled: widget.enabled,
      decoration: InputDecoration(
        labelText: widget.labelText,
        hintText: widget.hintText,
        // Restringe o espaço do prefix para evitar que ele ocupe largura demais
        prefix: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 120),
          child: InkWell(
            onTap: () => _showCountryPicker(context),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _selectedCountry.flag,
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    _selectedCountry.dialCode,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 2),
                const Icon(Icons.arrow_drop_down, size: 20),
                const SizedBox(width: 8),
              ],
            ),
          ),
        ),
        isDense: true,
        border: const OutlineInputBorder(),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 14,
        ),
      ),
      validator: _validatePhone,
    );
  }

  void _showCountryPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        height: 400,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text(
              'Selecionar País',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: CountryCodes.countries.length,
                itemBuilder: (context, index) {
                  final country = CountryCodes.countries[index];
                  return ListTile(
                    leading: Text(
                      country.flag,
                      style: const TextStyle(fontSize: 24),
                    ),
                    title: Text(country.name),
                    subtitle: Text(country.dialCode),
                    selected: country.code == _selectedCountry.code,
                    onTap: () {
                      _onCountryChanged(country);
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Método para obter o número completo com código do país
  String getFullPhoneNumber() {
    final cleanPhone = widget.controller.text.replaceAll(RegExp(r'[^0-9]'), '');
    return '${_selectedCountry.dialCode}$cleanPhone';
  }

  // Método para obter o país selecionado
  CountryCode get selectedCountry => _selectedCountry;
}