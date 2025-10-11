#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Teste Completo para o Sistema Compostos (Marketing Multinível)

Este script testa todas as funcionalidades principais do sistema:
- Autenticação de usuários
- Sistema de robôs investidores
- Transferências de criptomoedas
- Sistema de referrals
- Sistema de ranks e bônus
- Sistema de tarefas e gamificação
- Dashboard administrativo

Requisitos:
- Python 3.7+
- requests
- pytest
- python-dotenv
- web3 (para testes de blockchain)
"""

import os
import sys
import json
import time
import requests
import pytest
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('test_results.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

class CompostosSystemTester:
    def __init__(self):
        self.base_url = os.getenv('API_BASE_URL', 'http://localhost:5000/api')
        self.test_user = None
        self.test_token = None
        self.test_robot = None
        self.test_investment = None
        self.test_results = []
        
        # Configurações de teste
        self.test_config = {
            'user': {
                'name': 'Test User',
                'email': 'test@example.com',
                'password': 'Test@123456',
                'phone': '+1234567890'
            },
            'robot': {
                'name': 'Test Robot',
                'description': 'Robot for testing',
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
                'txHash': '0x1234567890123456789012345678901234567890'
            }
        }
        
        logger.info("Inicializando CompostosSystemTester")
        logger.info(f"API Base URL: {self.base_url}")

    def run_all_tests(self):
        """Executa todos os testes do sistema"""
        logger.info("Iniciando suite de testes completa")
        
        test_methods = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_robots,
            self.test_crypto_transfer_network_info,
            self.test_crypto_transfer_tokens,
            self.test_create_investment,
            self.test_get_user_investments,
            self.test_referral_system,
            self.test_ranks_system,
            self.test_tasks_system,
            self.test_dashboard_stats,
            self.test_admin_functions
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
        with open('test_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Salvar relatório em HTML
        self.generate_html_report(report)
        
        logger.info("Relatórios salvos: test_report.json, test_report.html")

    def generate_html_report(self, report: Dict[str, Any]):
        """Gera relatório em HTML"""
        html_content = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes - Compostos System</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px; }}
        .summary {{ display: flex; justify-content: space-between; margin: 20px 0; }}
        .summary-item {{ text-align: center; }}
        .pass {{ color: #27ae60; }}
        .fail {{ color: #e74c3c; }}
        .error {{ color: #f39c12; }}
        .test-result {{ margin: 10px 0; padding: 15px; border-left: 4px solid #ddd; }}
        .test-pass {{ border-left-color: #27ae60; }}
        .test-fail {{ border-left-color: #e74c3c; }}
        .test-error {{ border-left-color: #f39c12; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Testes - Compostos System</h1>
        <p>Data: {report['timestamp']}</p>
    </div>
    
    <div class="summary">
        <div class="summary-item">
            <h3>Total de Testes</h3>
            <h2>{report['summary']['total_tests']}</h2>
        </div>
        <div class="summary-item">
            <h3>Passaram</h3>
            <h2 class="pass">{report['summary']['passed']}</h2>
        </div>
        <div class="summary-item">
            <h3>Falharam</h3>
            <h2 class="fail">{report['summary']['failed']}</h2>
        </div>
        <div class="summary-item">
            <h3>Taxa de Sucesso</h3>
            <h2>{report['summary']['success_rate']}</h2>
        </div>
    </div>
    
    <h2>Ambiente de Teste</h2>
    <table>
        <tr><th>Configuração</th><th>Valor</th></tr>
        <tr><td>API URL</td><td>{report['environment']['api_url']}</td></tr>
        <tr><td>Usuário Teste</td><td>{report['environment']['test_user']}</td></tr>
        <tr><td>Robô Teste</td><td>{report['environment']['test_robot']}</td></tr>
    </table>
    
    <h2>Resultados Detalhados</h2>
"""
        
        for result in report['results']:
            status_class = f"test-{result['status'].lower()}"
            html_content += f"""
    <div class="test-result {status_class}">
        <h3>{result['test']}</h3>
        <p><strong>Status:</strong> <span class="{result['status'].lower()}">{result['status'].upper()}</span></p>
        <p><strong>Mensagem:</strong> {result['message']}</p>
    </div>
"""
        
        html_content += """
</body>
</html>
"""
        
        with open('test_report.html', 'w', encoding='utf-8') as f:
            f.write(html_content)

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
                    self.test_user = data.get('data')
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

    # ==================== TESTES DE ROBÔS ====================
    
    def test_get_robots(self) -> bool:
        """Testa obtenção de robôs disponíveis"""
        try:
            response = self.make_request('GET', '/robots', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    robots = data.get('data', [])
                    if len(robots) > 0:
                        self.test_robot = robots[0]
                        return True
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter robôs: {str(e)}")
            return False

    # ==================== TESTES DE TRANSFERÊNCIAS CRIPTO ====================
    
    def test_crypto_transfer_network_info(self) -> bool:
        """Testa obtenção de informações da rede"""
        try:
            response = self.make_request('GET', '/crypto-transfers/network-info', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('success')
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter informações da rede: {str(e)}")
            return False

    def test_crypto_transfer_tokens(self) -> bool:
        """Testa obtenção de tokens suportados"""
        try:
            response = self.make_request('GET', '/crypto-transfers/tokens', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    tokens = data.get('data', {}).get('tokens', [])
                    return len(tokens) > 0
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter tokens: {str(e)}")
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
                    self.test_investment = data.get('data')
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
                return data.get('success')
            
            return False
        except Exception as e:
            logger.error(f"Erro ao obter investimentos: {str(e)}")
            return False

    # ==================== TESTES DE REFERRALS ====================
    
    def test_referral_system(self) -> bool:
        """Testa sistema de referrals"""
        try:
            # Obter código de referral
            response = self.make_request('GET', '/referrals/code', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    # Testar estatísticas de referrals
                    stats_response = self.make_request('GET', '/referrals/stats', auth_required=True)
                    return stats_response.status_code == 200
            
            return False
        except Exception as e:
            logger.error(f"Erro no sistema de referrals: {str(e)}")
            return False

    # ==================== TESTES DE RANKS ====================
    
    def test_ranks_system(self) -> bool:
        """Testa sistema de ranks"""
        try:
            response = self.make_request('GET', '/ranks', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    ranks = data.get('data', [])
                    return len(ranks) > 0
            
            return False
        except Exception as e:
            logger.error(f"Erro no sistema de ranks: {str(e)}")
            return False

    # ==================== TESTES DE TAREFAS ====================
    
    def test_tasks_system(self) -> bool:
        """Testa sistema de tarefas"""
        try:
            response = self.make_request('GET', '/tasks', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    tasks = data.get('data', [])
                    return len(tasks) >= 0  # Pode ser vazio
            
            return False
        except Exception as e:
            logger.error(f"Erro no sistema de tarefas: {str(e)}")
            return False

    # ==================== TESTES DE DASHBOARD ====================
    
    def test_dashboard_stats(self) -> bool:
        """Testa estatísticas do dashboard"""
        try:
            response = self.make_request('GET', '/dashboard/stats', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('success')
            
            return False
        except Exception as e:
            logger.error(f"Erro no dashboard: {str(e)}")
            return False

    # ==================== TESTES ADMIN ====================
    
    def test_admin_functions(self) -> bool:
        """Testa funções administrativas"""
        try:
            # Testar obtenção de usuários (requer admin)
            response = self.make_request('GET', '/admin/users', auth_required=True)
            
            # Se retornar 403, é normal (usuário não é admin)
            # Se retornar 200, admin funciona
            return response.status_code in [200, 403]
            
        except Exception as e:
            logger.error(f"Erro nas funções admin: {str(e)}")
            return False

def main():
    """Função principal"""
    print("Iniciando Testes do Sistema Compostos")
    print("=" * 50)
    
    # Verificar se a API está rodando
    tester = CompostosSystemTester()
    
    if not tester.test_health_check():
        print("API não está respondendo. Verifique se o servidor está rodando.")
        print("Execute: node test-server.js (no diretório backend)")
        return 1
    
    print("API está respondendo. Iniciando testes...")
    print("=" * 50)
    
    # Executar todos os testes
    success = tester.run_all_tests()
    
    print("=" * 50)
    if success:
        print("Todos os testes passaram! Sistema está funcionando corretamente.")
        print("Relatórios salvos em: test_report.json e test_report.html")
    else:
        print("Alguns testes falharam. Verifique os logs para detalhes.")
        print("Relatórios salvos em: test_report.json e test_report.html")
    
    print("=" * 50)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
