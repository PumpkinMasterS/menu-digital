import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mask_text_input_formatter/mask_text_input_formatter.dart';
import 'package:compostos/providers/user_provider.dart';
import 'package:compostos/widgets/otp_verification_widget.dart';
import 'package:compostos/widgets/country_code_dropdown.dart';
import 'package:compostos/utils/country_codes.dart';

class RegisterAdvancedScreen extends ConsumerStatefulWidget {
  const RegisterAdvancedScreen({super.key});

  @override
  ConsumerState<RegisterAdvancedScreen> createState() => _RegisterAdvancedScreenState();
}

class _RegisterAdvancedScreenState extends ConsumerState<RegisterAdvancedScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _referralCodeController = TextEditingController();

  bool _isLoading = false;
  bool _showPassword = false;
  bool _isEmailRegistration = true;
  bool _verificationSent = false;
  bool _isVerifying = false;
  
  // País selecionado para o telefone (Portugal como padrão)
  CountryCode _selectedCountry = CountryCodes.defaultCountry;

  // Máscara para telefone brasileiro (mantida para compatibilidade)
  final _phoneMask = MaskTextInputFormatter(
    mask: '(##) #####-####',
    filter: {"#": RegExp(r'[0-9]')},
  );

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _referralCodeController.dispose();
    super.dispose();
  }

  Future<void> _sendVerification() async {
    if (_formKey.currentState!.validate()) {
      try {
        setState(() => _isLoading = true);
        
        // Simulação de envio de verificação
        await Future.delayed(const Duration(seconds: 2));
        
        setState(() {
          _verificationSent = true;
          _isLoading = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEmailRegistration 
                ? 'Código enviado para seu email!' 
                : 'SMS enviado para seu telefone!'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      } catch (e) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Erro ao enviar verificação'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<void> _verifyAndRegister(String code) async {
    setState(() => _isVerifying = true);
    
    try {
      // Simulação de verificação
      await Future.delayed(const Duration(seconds: 1));
      
      await ref.read(userProvider.notifier).register(
        _nameController.text,
        _isEmailRegistration ? _emailController.text : _phoneController.text,
        _passwordController.text,
        referralCode: _referralCodeController.text.isNotEmpty 
            ? _referralCodeController.text 
            : null,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Conta criada com sucesso!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
        await Future.delayed(const Duration(milliseconds: 500));
        context.go('/dashboard');
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = 'Erro no registro';
        
        if (e.toString().contains('400') || e.toString().contains('Bad Request')) {
          errorMessage = 'Dados inválidos. Verifique as informações';
        } else if (e.toString().contains('409') || e.toString().contains('Conflict')) {
          errorMessage = _isEmailRegistration 
              ? 'Email já cadastrado' 
              : 'Telefone já cadastrado';
        } else if (e.toString().contains('Network') || e.toString().contains('Socket')) {
          errorMessage = 'Erro de conexão. Verifique sua internet';
        } else if (e.toString().contains('500') || e.toString().contains('Internal')) {
          errorMessage = 'Erro no servidor. Tente novamente mais tarde';
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
        
        // Retorna erro para o widget OTP
        throw Exception(errorMessage);
      }
    } finally {
      if (mounted) {
        setState(() => _isVerifying = false);
      }
    }
  }

  String? _validatePhone(String? value) {
    if (value == null || value.isEmpty) {
      return 'Por favor, digite seu telefone';
    }
    
    // Remove caracteres não numéricos
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
    
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Criar Conta'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Card(
            elevation: 8,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.account_balance_wallet,
                    size: 64,
                    color: Color(0xFF2563EB),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Criar Conta',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Escolha como deseja se cadastrar',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Seletor de método de cadastro
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ChoiceChip(
                        label: const Text('Email'),
                        selected: _isEmailRegistration,
                        onSelected: (selected) {
                          setState(() => _isEmailRegistration = true);
                        },
                      ),
                      const SizedBox(width: 16),
                      ChoiceChip(
                        label: const Text('Telefone'),
                        selected: !_isEmailRegistration,
                        onSelected: (selected) {
                          setState(() => _isEmailRegistration = false);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Nome Completo',
                            prefixIcon: Icon(Icons.person),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Por favor, digite seu nome';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // Campo dinâmico (email ou telefone)
                        _isEmailRegistration
                            ? TextFormField(
                                controller: _emailController,
                                decoration: const InputDecoration(
                                  labelText: 'Email',
                                  prefixIcon: Icon(Icons.email),
                                  border: OutlineInputBorder(),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Por favor, digite seu email';
                                  }
                                  if (!value.contains('@')) {
                                    return 'Por favor, digite um email válido';
                                  }
                                  return null;
                                },
                              )
                            : PhoneInputWithCountryCode(
                                controller: _phoneController,
                                labelText: 'Telefone',
                                hintText: _selectedCountry.code == 'PT' ? '912345678' : '11999999999',
                                initialCountry: _selectedCountry,
                                onCountryChanged: (country) {
                                  setState(() {
                                    _selectedCountry = country;
                                  });
                                },
                                validator: _validatePhone,
                              ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _passwordController,
                          decoration: InputDecoration(
                            labelText: 'Senha',
                            prefixIcon: const Icon(Icons.lock),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _showPassword ? Icons.visibility : Icons.visibility_off,
                              ),
                              onPressed: () {
                                setState(() => _showPassword = !_showPassword);
                              },
                            ),
                            border: const OutlineInputBorder(),
                          ),
                          obscureText: !_showPassword,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Por favor, digite sua senha';
                            }
                            if (value.length < 6) {
                              return 'A senha deve ter pelo menos 6 caracteres';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _confirmPasswordController,
                          decoration: const InputDecoration(
                            labelText: 'Confirmar Senha',
                            prefixIcon: Icon(Icons.lock_outline),
                            border: OutlineInputBorder(),
                          ),
                          obscureText: true,
                          validator: (value) {
                            if (value != _passwordController.text) {
                              return 'As senhas não coincidem';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _referralCodeController,
                          decoration: const InputDecoration(
                            labelText: 'Código de Indicação (Opcional)',
                            prefixIcon: Icon(Icons.people),
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Widget de verificação OTP (após envio)
                        if (_verificationSent)
                          Column(
                            children: [
                              OtpVerificationWidget(
                                contact: _isEmailRegistration 
                                    ? _emailController.text 
                                    : _phoneController.text,
                                isEmail: _isEmailRegistration,
                                onVerify: (code) async {
                                  try {
                                    await _verifyAndRegister(code);
                                  } catch (e) {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Erro no registro: $e'),
                                          backgroundColor: Colors.red,
                                        ),
                                      );
                                    }
                                  }
                                },
                                onResend: _sendVerification,
                                isLoading: _isVerifying,
                              ),
                              const SizedBox(height: 24),
                            ],
                          ),

                        // Botão de envio (apenas quando não foi enviado ainda)
                        if (!_verificationSent)
                          ElevatedButton(
                            onPressed: _isLoading ? null : _sendVerification,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(_isEmailRegistration
                                    ? 'Enviar Código por Email'
                                    : 'Enviar Código por SMS'),
                          ),
                        const SizedBox(height: 16),

                        TextButton(
                          onPressed: () => context.go('/login'),
                          child: const Text('Já tem uma conta? Faça login'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}