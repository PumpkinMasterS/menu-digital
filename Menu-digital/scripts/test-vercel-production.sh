#!/bin/bash
# Script de Teste - Validação Completa Vercel + IfThenPay
# Execute após remover a Deployment Protection

DOMAIN="https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app"
KEY="APk9%23vB7tL2xQ%21sR"  # URL encoded
KEY_RAW="APk9#vB7tL2xQ!sR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}========================================${NC}"
echo -e "${CYAN}TESTES DE VALIDAÇÃO - VERCEL PRODUCTION${NC}"
echo -e "${CYAN}========================================\n${NC}"

# Test 1: HEAD Healthcheck
echo -e "${YELLOW}[1/7] Testing HEAD healthcheck...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X HEAD "$DOMAIN/v1/public/payments/ifthenpay/callback")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ PASS - Status: 200 OK${NC}"
else
    echo -e "${RED}❌ FAIL - Status: $response${NC}"
fi

# Test 2: GET Healthcheck
echo -e "\n${YELLOW}[2/7] Testing GET healthcheck...${NC}"
response=$(curl -s "$DOMAIN/v1/public/payments/ifthenpay/callback?healthcheck=1")
if echo "$response" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ PASS - Response: {ok: true}${NC}"
else
    echo -e "${RED}❌ FAIL - Unexpected response: $response${NC}"
fi

# Test 3: Empty query
echo -e "\n${YELLOW}[3/7] Testing empty query...${NC}"
response=$(curl -s "$DOMAIN/v1/public/payments/ifthenpay/callback")
if echo "$response" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ PASS - Response: {ok: true}${NC}"
else
    echo -e "${RED}❌ FAIL - Unexpected response: $response${NC}"
fi

# Test 4: Invalid Anti-Phishing Key
echo -e "\n${YELLOW}[4/7] Testing invalid anti-phishing key (should fail)...${NC}"
status=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/v1/public/payments/ifthenpay/callback?Key=INVALID_KEY")
if [ "$status" = "401" ]; then
    echo -e "${GREEN}✅ PASS - Correctly rejected with 401 Unauthorized${NC}"
else
    echo -e "${RED}❌ FAIL - Expected 401, got: $status${NC}"
fi

# Test 5: Valid Key but missing RequestId
echo -e "\n${YELLOW}[5/7] Testing valid key without RequestId (should fail)...${NC}"
status=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/v1/public/payments/ifthenpay/callback?Key=$KEY")
if [ "$status" = "400" ]; then
    echo -e "${GREEN}✅ PASS - Correctly rejected with 400 Bad Request${NC}"
else
    echo -e "${RED}❌ FAIL - Expected 400, got: $status${NC}"
fi

# Test 6: Proxy /v1 to Railway backend
echo -e "\n${YELLOW}[6/7] Testing proxy /v1 to Railway backend...${NC}"
status=$(curl -s -o /tmp/response.json -w "%{http_code}" "$DOMAIN/v1/public/products")
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅ PASS - Backend responded (proxy working)${NC}"
    echo -e "${GRAY}Response preview: $(cat /tmp/response.json | head -c 200)...${NC}"
elif [ "$status" = "404" ]; then
    echo -e "${YELLOW}⚠️  WARN - 404: Endpoint may not exist, but proxy is working${NC}"
else
    echo -e "${RED}❌ FAIL - Status: $status${NC}"
fi

# Test 7: Proxy /public to Railway backend
echo -e "\n${YELLOW}[7/7] Testing proxy /public to Railway backend...${NC}"
status=$(curl -s -o /tmp/response.json -w "%{http_code}" "$DOMAIN/public/health")
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅ PASS - Backend responded (proxy working)${NC}"
    echo -e "${GRAY}Response preview: $(cat /tmp/response.json | head -c 200)...${NC}"
elif [ "$status" = "404" ]; then
    echo -e "${YELLOW}⚠️  WARN - 404: Endpoint may not exist, but proxy is working${NC}"
else
    echo -e "${RED}❌ FAIL - Status: $status${NC}"
fi

# Summary
echo -e "\n${CYAN}========================================${NC}"
echo -e "${CYAN}RESUMO DOS TESTES${NC}"
echo -e "${CYAN}========================================\n${NC}"

echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo -e "1. Se todos os testes passaram, configure o callback no backoffice IfThenPay"
echo -e "   ${GRAY}URL: $DOMAIN/v1/public/payments/ifthenpay/callback${NC}"
echo -e "   ${GRAY}Anti-Phishing Key: $KEY_RAW${NC}"
echo ""
echo -e "2. Crie um pedido de teste no sistema para gerar um payment com:"
echo -e "   ${GRAY}- requestId: REQ123${NC}"
echo -e "   ${GRAY}- method: mbway${NC}"
echo -e "   ${GRAY}- status: pending${NC}"
echo ""
echo -e "3. Teste o callback completo com:"
echo -e "   ${GRAY}curl \"$DOMAIN/v1/public/payments/ifthenpay/callback?Key=$KEY&RequestId=REQ123&Estado=000\"${NC}"
echo ""
echo -e "4. Verifique no MongoDB Atlas que:"
echo -e "   ${GRAY}- payments.status = 'completed'${NC}"
echo -e "   ${GRAY}- payments.paidAt está preenchido${NC}"
echo -e "   ${GRAY}- orders.paymentStatus = 'paid'${NC}"
echo -e "   ${GRAY}- orders.paidAt está preenchido${NC}"
echo ""

echo -e "${CYAN}========================================\n${NC}"

# Cleanup
rm -f /tmp/response.json

