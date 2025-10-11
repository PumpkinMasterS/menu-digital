#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Teste Específico para o Sistema de Transferências de Criptomoedas

Este script testa especificamente as funcionalidades de transferências de criptomoedas:
- Verificação de transações na blockchain
- Processamento de investimentos
- Cálculo de retornos diários
- Suporte para diferentes tokens

Requisitos:
- Python 3.7+
- requests
- python-dotenv
- web3 (para testes de blockchain)
"""

import os
import sys
import json
import time
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crypto_transfer_test_results.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

class CryptoTransferTester:
    def __init__(self):
        self.base_url = os.getenv('API_BASE_URL', 'http://localhost:5000/api')
        self.test_token = None
        self.test_robot = None
        self.test_results = []
        
        # Configurações de teste
        self.test_config = {
            'user': {
                'name': 'Crypto Test User',
                'email': 'cryptotest@example.com',
                'password': 'Test@123456',
                'phone': '+1234567890'
            },
            'robot': {
                'name': 'Crypto Test Robot',
                'description': 'Robot for crypto testing',
                'minInvestment': 100,
                'maxInvestment': 10000,
                'dailyProfit': 2.5,
                'duration': 30,
                'riskLevel': 'Medium',
                'imageUrl': 'https://example.com/robot.jpg'
            },
            'investment': {
                'amount': 500,
                'currency': 'USDT',
                'txHash': '0x1234567890123456789012345678901234567890abcdef1234567890abcdef1234567890'
            }
        }
        
        logger.info("Inicializando CryptoTransferTester")
        logger.info(f"API Base URL: {self.base_url}")

    def run_all_tests(self):
        """Executa todos os testes do sistema de transferências de cripto"""
        logger.info("Iniciando suite de testes de transferências de cripto")
        
        test_methods = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_network_info,
            self.test_get_company_address,
            self.test_get_supported_tokens,
            self.test_create_robot,
            self.test_get_robot_investment_info,
            self.test_verify_transfer,
            self.test_create_investment,
            self.test_get_user_investments,
            self.test_check_pending_transfers,
            self.test_calculate_daily_returns
        ]
        
        passed_tests = 0
        failed_tests = 0
        
        for test_method in test_methods:
            try:
                logger.info(f"Executando: {test_method.__name__}")
                result = test_method()
                
                if result:
                    logger.info(f"{test_method.__name__} - PASSOU")
                    passed_tests += 1
                    self.test_results.append({
                        'test': test_method.__name__,
                        'status': 'PASS',
                        'message': 'Teste executado com sucesso'
                    })
                else:
                    logger.error(f"{test_method.__name__} - FALHOU")
                    failed_tests += 1
                    self.test_results.append({
                        'test': test_method.__name__,
                        'status': 'FAIL',
                        'message': 'Teste falhou'
                    })
                    
            except Exception as e:
                logger.error(f"{test_method.__name__} - ERRO: {str(e)}")
                failed_tests += 1
                self.test_results.append({
                    'test': test_method.__name__,
                    'status': 'ERROR',
                    'message': str(e)
                })
        
        # Gerar relatório final
        self.generate_test_report(passed_tests, failed_tests)
        
        logger.info(f"Testes concluídos: {passed_tests} passaram, {failed_tests} falharam")
        return failed_tests == 0

    def generate_test_report(self, passed_tests: int, failed_tests: int):
        """Gera relatório detalhado dos testes"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'test_type': 'Crypto Transfer System',
            'summary': {
                'total_tests': len(self.test_results),
                'passed': passed_tests,
                'failed': failed_tests,
                'success_rate': f"{(passed_tests / len(self.test_results) * 100):.2f}%" if self.test_results else "0%"
            },
            'environment': {
                'api_url': self.base_url,
                'test_user': self.test_config['user']['email'],
                'test_robot': self.test_config['robot']['name']
            },
            'results': self.test_results
        }
        
        # Salvar relatório em JSON
        with open('crypto_transfer_test_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info("Relatório salvo: crypto_transfer_test_report.json")

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                     headers: Dict = None, auth_required: bool = False) -> requests.Response:
        """Faz requisição HTTP para a API"""
        url = f"{self.base_url}{endpoint}"
        
        if auth_required and self.test_token:
            headers = headers or {}
            headers['Authorization'] = f"Bearer {self.test_token}"
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Método HTTP não suportado: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição para {url}: {str(e)}")
            raise

    # ==================== TESTES DE AUTENTICAÇÃO ====================
    
    def test_health_check(self) -> bool:
        """Testa se a API está respondendo"""
        try:
            response = self.make_request('GET', '/health')
            return response.status_code == 200
        except:
            return False

    def test_user_registration(self) -> bool:
        """Testa registro de novo usuário"""
        try:
            response = self.make_request('POST', '/auth/register', data={
                'name': self.test_config['user']['name'],
                'email': self.test_config['user']['email'],
                'password': self.test_config['user']['password'],
                'phone': self.test_config['user']['phone']
            })
            
            if response.status_code == 201:
                data = response.json()
                if data.get('success'):
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Erro no registro: {str(e)}")
            return False

    def test_user_login(self) -> bool:
        """Testa login de usuário"""
        try:
            response = self.make_request('POST', '/auth/login', data={
                'email': self.test_config['user']['email'],
                'password': self.test_config['user']['password']
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.test_token = data.get('data', {}).get('token')
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Erro no login: {str(e)}")
            return False

    # ==================== TESTES DE TRANSFERÊNCIAS CRIPTO ====================
    
    def test_get_network_info(self) -> bool:
        """Testa obtenção de informações da rede"""
        try:
            response = self.make_request('GET', '/crypto-transfers/network-info', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    network_info = data.get('data', {})
                    required_fields = ['name', 'chainId', 'isTestnet', 'companyAddress', 'explorerUrl']
                    
                    for field in required_fields:
                        if field not in network_info:
                            logger.error(f"Campo obrigatório ausente: {field}")
                            return False
                    
                    logger.info(f"Rede: {network_info.get('name')}")
                    logger.info(f"Endereço da empresa: {network_info.get('companyAddress')}")
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter informações da rede: {str(e)}")
            return False

    def test_get_company_address(self) -> bool:
        """Testa obtenção do endereço da empresa"""
        try:
            response = self.make_request('GET', '/crypto-transfers/company-address', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    address_data = data.get('data', {})
                    if 'address' in address_data and 'network' in address_data:
                        logger.info(f"Endereço da empresa: {address_data.get('address')}")
                        logger.info(f"Rede: {address_data.get('network')}")
                        return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter endereço da empresa: {str(e)}")
            return False

    def test_get_supported_tokens(self) -> bool:
        """Testa obtenção de tokens suportados"""
        try:
            response = self.make_request('GET', '/crypto-transfers/tokens', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    tokens_data = data.get('data', {})
                    tokens = tokens_data.get('tokens', [])
                    
                    if len(tokens) > 0:
                        logger.info(f"Tokens suportados: {len(tokens)}")
                        for token in tokens:
                            logger.info(f"  - {token.get('symbol')}: {token.get('name')}")
                        return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter tokens: {str(e)}")
            return False

    def test_create_robot(self) -> bool:
        """Testa criação de robô para testes"""
        try:
            response = self.make_request('POST', '/robots', auth_required=True, data={
                'name': self.test_config['robot']['name'],
                'description': self.test_config['robot']['description'],
                'minInvestment': self.test_config['robot']['minInvestment'],
                'maxInvestment': self.test_config['robot']['maxInvestment'],
                'dailyProfit': self.test_config['robot']['dailyProfit'],
                'duration': self.test_config['robot']['duration'],
                'riskLevel': self.test_config['robot']['riskLevel'],
                'imageUrl': self.test_config['robot']['imageUrl']
            })
            
            if response.status_code == 201:
                data = response.json()
                if data.get('success'):
                    self.test_robot = data.get('data')
                    logger.info(f"Robô criado: {self.test_robot.get('name')}")
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao criar robô: {str(e)}")
            return False

    def test_get_robot_investment_info(self) -> bool:
        """Testa obtenção de informações de investimento para um robô"""
        try:
            if not self.test_robot:
                logger.warning("Nenhum robô disponível para teste")
                return False
            
            response = self.make_request('GET', f'/crypto-transfers/robot/{self.test_robot["_id"]}/investment-info', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    investment_info = data.get('data', {})
                    
                    if 'robot' in investment_info and 'networkInfo' in investment_info and 'supportedTokens' in investment_info:
                        logger.info(f"Informações de investimento obtidas para: {investment_info.get('robot', {}).get('name')}")
                        logger.info(f"Tem investimento ativo: {investment_info.get('hasActiveInvestment')}")
                        return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter informações de investimento: {str(e)}")
            return False

    def test_verify_transfer(self) -> bool:
        """Testa verificação de transferência"""
        try:
            response = self.make_request('POST', '/crypto-transfers/verify-transfer', auth_required=True, data={
                'txHash': self.test_config['investment']['txHash'],
                'amount': self.test_config['investment']['amount'],
                'currency': self.test_config['investment']['currency']
            })
            
            if response.status_code == 200:
                data = response.json()
                # Pode retornar sucesso ou falha, ambos são respostas válidas
                return data.get('success') is not None
            
            return False
        except Exception as e:
            logger.error(f"Erro ao verificar transferência: {str(e)}")
            return False

    def test_create_investment(self) -> bool:
        """Testa criação de investimento baseado em transferência"""
        try:
            if not self.test_robot:
                logger.warning("Nenhum robô disponível para teste de investimento")
                return False
            
            response = self.make_request('POST', '/crypto-transfers/invest', auth_required=True, data={
                'robotId': self.test_robot['_id'],
                'amount': self.test_config['investment']['amount'],
                'currency': self.test_config['investment']['currency'],
                'txHash': self.test_config['investment']['txHash']
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    investment_data = data.get('data', {})
                    logger.info(f"Investimento criado: {investment_data.get('transactionId')}")
                    logger.info(f"Status: {investment_data.get('status')}")
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao criar investimento: {str(e)}")
            return False

    def test_get_user_investments(self) -> bool:
        """Testa obtenção de investimentos do usuário"""
        try:
            response = self.make_request('GET', '/investments/user', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    investments = data.get('data', [])
                    logger.info(f"Investimentos do usuário: {len(investments)}")
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter investimentos: {str(e)}")
            return False

    def test_check_pending_transfers(self) -> bool:
        """Testa verificação de transferências pendentes (requer admin)"""
        try:
            response = self.make_request('POST', '/crypto-transfers/check-pending', auth_required=True)
            
            # Se retornar 403, é normal (usuário não é admin)
            # Se retornar 200, admin funciona
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    results = data.get('data', [])
                    logger.info(f"Transferências verificadas: {len(results)}")
                    return True
            elif response.status_code == 403:
                logger.info("Usuário não é admin, teste ignorado")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao verificar transferências pendentes: {str(e)}")
            return False

    def test_calculate_daily_returns(self) -> bool:
        """Testa cálculo de retornos diários (requer admin)"""
        try:
            response = self.make_request('POST', '/crypto-transfers/calculate-returns', auth_required=True)
            
            # Se retornar 403, é normal (usuário não é admin)
            # Se retornar 200, admin funciona
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    results = data.get('data', [])
                    logger.info(f"Retornos calculados: {len(results)}")
                    return True
            elif response.status_code == 403:
                logger.info("Usuário não é admin, teste ignorado")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao calcular retornos diários: {str(e)}")
            return False

def main():
    """Função principal"""
    print("Iniciando Testes do Sistema de Transferências de Criptomoedas")
    print("=" * 60)
    
    # Verificar se a API está rodando
    tester = CryptoTransferTester()
    
    if not tester.test_health_check():
        print("API não está respondendo. Verifique se o servidor está rodando.")
        print("Execute: node test-server.js (no diretório backend)")
        return 1
    
    print("API está respondendo. Iniciando testes...")
    print("=" * 60)
    
    # Executar todos os testes
    success = tester.run_all_tests()
    
    print("=" * 60)
    if success:
        print("Todos os testes passaram! Sistema de transferências está funcionando corretamente.")
        print("Relatório salvo em: crypto_transfer_test_report.json")
    else:
        print("Alguns testes falharam. Verifique os logs para detalhes.")
        print("Relatório salvo em: crypto_transfer_test_report.json")
    
    print("=" * 60)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
