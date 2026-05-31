Set-StrictMode -Version Latest
cd (Split-Path -Parent $MyInvocation.MyCommand.Definition)

$bodyObj = @{ cliente = @{ nome = 'Maria' }; itens = @( @{ sku='prod-2'; quantidade=2 } ); total = 200 }
$body = $bodyObj | ConvertTo-Json -Depth 5
Write-Output '--- POST /pedidos body ---'
Write-Output $body

try {
    $resp = Invoke-RestMethod -Uri 'http://localhost:3001/pedidos' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 15
    Write-Output '--- POST response ---'
    Write-Output (ConvertTo-Json $resp)
} catch {
    Write-Output 'POST error: ' + $_.Exception.Message
}

Write-Output '--- pagamentos logs ---'
docker compose logs --no-color pagamentos --since 1m
Write-Output '--- estoque logs ---'
docker compose logs --no-color estoque --since 1m

Write-Output '--- metrics pedidos ---'
try {
    $m = Invoke-WebRequest http://localhost:3001/metrics -UseBasicParsing -TimeoutSec 5
    Write-Output $m.Content
} catch {
    Write-Output 'metrics error: ' + $_.Exception.Message
}
