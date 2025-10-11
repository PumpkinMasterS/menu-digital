import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../services/otp_service.dart';
import '../services/email_service.dart';
import '../services/sms_service.dart';

class OtpVerificationWidget extends StatefulWidget {
  final String contact; // Email ou telefone
  final bool isEmail; // true para email, false para telefone
  final Function(String code) onVerify; // Callback quando código é verificado
  final VoidCallback onResend; // Callback para reenviar código
  final bool isLoading; // Estado de carregamento

  const OtpVerificationWidget({
    Key? key,
    required this.contact,
    required this.isEmail,
    required this.onVerify,
    required this.onResend,
    this.isLoading = false,
  }) : super(key: key);

  @override
  State<OtpVerificationWidget> createState() => _OtpVerificationWidgetState();
}

class _OtpVerificationWidgetState extends State<OtpVerificationWidget> {
  final List<TextEditingController> _controllers = [];
  final List<FocusNode> _focusNodes = [];
  
  bool _isCodeSent = false;
  bool _isVerifying = false;
  bool _canResend = false;
  int _resendCountdown = 60;
  Timer? _timer;
  String? _errorMessage;
  String? _currentCode;
  
  @override
  void initState() {
    super.initState();
    
    // Inicializa controladores e focus nodes para 6 dígitos
    for (int i = 0; i < 6; i++) {
      _controllers.add(TextEditingController());
      _focusNodes.add(FocusNode());
    }
    
    // Envia código automaticamente ao inicializar
    _sendCode();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var focusNode in _focusNodes) {
      focusNode.dispose();
    }
    super.dispose();
  }

  void _startResendTimer() {
    _canResend = false;
    _resendCountdown = 60;
    
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          if (_resendCountdown > 0) {
            _resendCountdown--;
          } else {
            _canResend = true;
            timer.cancel();
          }
        });
      }
    });
  }

  Future<void> _sendCode() async {
    setState(() {
      _isCodeSent = false;
      _errorMessage = null;
    });

    try {
      final code = OtpService.generateOtp();
      _currentCode = code;
      
      // Envia o código OTP
      bool success = false;
      if (widget.isEmail) {
        success = await OtpService.sendOtpEmail(widget.contact);
      } else {
        success = await OtpService.sendOtpSms(widget.contact);
      }

      if (success) {
        setState(() {
          _isCodeSent = true;
          _startResendTimer();
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Código enviado para ${widget.isEmail ? EmailService.maskEmail(widget.contact) : SmsService.maskPhone(widget.contact)}',
              ),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        setState(() {
          _errorMessage = 'Falha ao enviar código. Tente novamente.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Erro ao enviar código: $e';
      });
    }
  }

  Future<void> _verifyCode() async {
    final code = _controllers.map((c) => c.text).join();
    
    if (code.length != 6) {
      setState(() {
        _errorMessage = 'Digite o código completo de 6 dígitos';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      final isValid = await OtpService.validateOtp(widget.contact, code);
      
      if (isValid) {
        widget.onVerify(code);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Código verificado com sucesso!'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        setState(() {
          _errorMessage = 'Código inválido. Tente novamente.';
          // Limpa os campos
          for (var controller in _controllers) {
            controller.clear();
          }
          _focusNodes[0].requestFocus();
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Erro ao verificar código: $e';
      });
    } finally {
      setState(() {
        _isVerifying = false;
      });
    }
  }

  void _onCodeChanged(String value, int index) {
    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    
    // Verifica automaticamente quando todos os campos estão preenchidos
    final code = _controllers.map((c) => c.text).join();
    if (code.length == 6) {
      _verifyCode();
    }
  }

  void _onBackspace(int index) {
    if (index > 0 && _controllers[index].text.isEmpty) {
      _focusNodes[index - 1].requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Título e informações
        Text(
          'Verificação de ${widget.isEmail ? 'Email' : 'Telefone'}',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        
        Text(
          'Digite o código de 6 dígitos enviado para:',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        
        Text(
          widget.isEmail 
            ? EmailService.maskEmail(widget.contact)
                : SmsService.maskPhone(widget.contact),
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 20),

        // Campos de entrada do código
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(6, (index) {
            return SizedBox(
              width: 45,
              height: 55,
              child: TextFormField(
                controller: _controllers[index],
                focusNode: _focusNodes[index],
                textAlign: TextAlign.center,
                keyboardType: TextInputType.number,
                maxLength: 1,
                enabled: _isCodeSent && !_isVerifying,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                decoration: InputDecoration(
                  counterText: '',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: _errorMessage != null ? Colors.red : Colors.grey,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(
                      color: Colors.blue,
                      width: 2,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(
                      color: Colors.red,
                      width: 2,
                    ),
                  ),
                  filled: true,
                  fillColor: _isCodeSent && !_isVerifying 
                    ? Colors.white 
                    : Colors.grey[100],
                ),
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                ],
                onChanged: (value) => _onCodeChanged(value, index),
                onTap: () {
                  // Limpa erro ao tocar no campo
                  if (_errorMessage != null) {
                    setState(() {
                      _errorMessage = null;
                    });
                  }
                },
                onFieldSubmitted: (value) {
                  if (value.isEmpty && index > 0) {
                    _onBackspace(index);
                  }
                },
              ),
            );
          }),
        ),
        const SizedBox(height: 16),

        // Mensagem de erro
        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.red[600], size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(
                      color: Colors.red[600],
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
        
        if (_errorMessage != null) const SizedBox(height: 16),

        // Status de verificação
        if (_isVerifying)
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(width: 12),
              Text(
                'Verificando código...',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.blue,
                ),
              ),
            ],
          ),

        // Botão de reenvio
        if (!_isVerifying)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Não recebeu o código? ',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
              if (_canResend)
                TextButton(
                  onPressed: () {
                    // Limpa campos antes de reenviar
                    for (var controller in _controllers) {
                      controller.clear();
                    }
                    setState(() {
                      _errorMessage = null;
                    });
                    _sendCode();
                    widget.onResend();
                  },
                  child: const Text(
                    'Reenviar',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              else
                Text(
                  'Reenviar em ${OtpService.formatTimeRemaining(_resendCountdown)}',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[500],
                  ),
                ),
            ],
          ),
      ],
    );
  }
}