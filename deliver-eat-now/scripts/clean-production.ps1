Write-Host "🧹 Limpando arquivos desnecessários para produção..." -ForegroundColor Green
Write-Host ""

# Arquivos e padrões para remover
$filesToRemove = @(
    "test-*.js",
    "test-*.mjs", 
    "quick-test.js",
    "quick-test.mjs",
    "setup-e2e-test.js",
    "demo-script.js",
    "package-test.json",
    "come acessar os roles.xlsx",
    "test-*.md",
    "TESTE-*.md"
)

# Diretórios para remover
$dirsToRemove = @(
    ".cursor"
)

$removedCount = 0
$errorCount = 0

# Remover arquivos por padrão
foreach ($pattern in $filesToRemove) {
    try {
        $files = Get-ChildItem -Path "." -Filter $pattern -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            try {
                Remove-Item $file.FullName -Force
                Write-Host "✅ Removido: $($file.Name)" -ForegroundColor Green
                $removedCount++
            }
            catch {
                Write-Host "⚠️  Não foi possível remover: $($file.Name) ($($_.Exception.Message))" -ForegroundColor Yellow
                $errorCount++
            }
        }
    }
    catch {
        Write-Host "❌ Erro ao processar: $pattern ($($_.Exception.Message))" -ForegroundColor Red
        $errorCount++
    }
}

# Remover diretórios
foreach ($dir in $dirsToRemove) {
    try {
        if (Test-Path $dir) {
            Remove-Item $dir -Recurse -Force
            Write-Host "✅ Diretório removido: $dir" -ForegroundColor Green
            $removedCount++
        }
        else {
            Write-Host "ℹ️  Diretório não encontrado: $dir" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Host "❌ Erro ao remover diretório: $dir ($($_.Exception.Message))" -ForegroundColor Red
        $errorCount++
    }
}

# Verificar duplicações específicas
Write-Host ""
Write-Host "🔍 Verificando duplicações no src/..." -ForegroundColor Blue

$duplicates = @(
    "src\pages\AdminDashboard-updated.tsx"
)

foreach ($file in $duplicates) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "✅ Duplicado removido: $file" -ForegroundColor Green
            $removedCount++
        }
        catch {
            Write-Host "❌ Erro ao remover duplicado: $file ($($_.Exception.Message))" -ForegroundColor Red
            $errorCount++
        }
    }
}

# Verificar arquivos .log
Write-Host ""
Write-Host "📋 Verificando arquivos de log..." -ForegroundColor Blue
$logFiles = Get-ChildItem -Path "." -Filter "*.log" -ErrorAction SilentlyContinue
if ($logFiles.Count -gt 0) {
    Write-Host "⚠️  Encontrados $($logFiles.Count) arquivos .log - considere removê-los manualmente:" -ForegroundColor Yellow
    foreach ($log in $logFiles) {
        Write-Host "   - $($log.Name)" -ForegroundColor Gray
    }
}

# Verificar node_modules
Write-Host ""
Write-Host "📦 Verificando dependências..." -ForegroundColor Blue
if (Test-Path "node_modules") {
    Write-Host "ℹ️  node_modules presente - execute 'npm prune' para remover dependências desnecessárias" -ForegroundColor Cyan
}

# Sumário
Write-Host ""
Write-Host "📊 RESUMO DA LIMPEZA:" -ForegroundColor Magenta
Write-Host "✅ Arquivos/diretórios removidos: $removedCount" -ForegroundColor Green
Write-Host "❌ Erros encontrados: $errorCount" -ForegroundColor Red

if ($removedCount -gt 0) {
    Write-Host ""
    Write-Host "🎉 Limpeza concluída! Projeto otimizado para produção." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "✨ Projeto já estava limpo!" -ForegroundColor Green
}

# Comandos recomendados
Write-Host ""
Write-Host "🚀 PRÓXIMOS PASSOS RECOMENDADOS:" -ForegroundColor Cyan
Write-Host "   1. npm prune (remover dependências não utilizadas)" -ForegroundColor White
Write-Host "   2. npm run build (gerar build otimizado)" -ForegroundColor White
Write-Host "   3. npm run build:analyze (analisar tamanho do bundle)" -ForegroundColor White 