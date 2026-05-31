# Pedidos Veloz

Resumo com passos para rodar o projeto localmente (Node) e com Docker Compose.

**Pré-requisitos**
- Node.js (>=18) e `npm` para executar localmente
- Docker Desktop para usar `docker compose` (opcional)

**Rodando com Node (rápido, sem Docker)**
Abra um terminal para cada serviço e execute:

```powershell
# no Windows (exemplo a partir da raiz do repo)
cd gateway
npm install
node index.js

# em outro terminal
cd pedidos
npm install
node index.js

# em outro terminal
cd pagamentos
npm install
node index.js

# em outro terminal
cd estoque
npm install
node index.js
```

Ou abra todos automaticamente (PowerShell):

```powershell
$base = "$(Get-Location)"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd $base\gateway; npm install; node index.js"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd $base\pedidos; npm install; node index.js"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd $base\pagamentos; npm install; node index.js"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd $base\estoque; npm install; node index.js"
```

**Rodando com Docker Compose**
1. Instale Docker Desktop e ative WSL2 (Windows) se solicitado.
2. Na raiz do repositório execute:

```powershell
cd C:\caminho\para\repositorio\pedidos_veloz
docker compose up -d --build
```

Após o Compose subir, valide o fluxo de mensageria e consumidores com um POST em `pedidos`:

```powershell
Invoke-RestMethod http://localhost:3001/pedidos -Method Post -Body (@{
  cliente = @{ nome = 'Maria' }
  itens = @(@{ sku = 'prod-2'; quantidade = 2 })
  total = 200
} | ConvertTo-Json) -ContentType 'application/json'
```

Você também pode usar o script de teste pronto:

```powershell
.\scripts\test_flow.ps1
```

Ver status e logs:

```powershell
docker compose ps
docker compose logs -f gateway
docker compose logs -f pedidos
docker compose logs -f pagamentos
docker compose logs -f estoque
docker compose down
```

> Se o comando `docker` não for reconhecido, instale o Docker Desktop: https://www.docker.com/products/docker-desktop

**Testes rápidos (HTTP)**
- Navegador: `http://localhost:3000/`, `http://localhost:3001/`, `http://localhost:3002/`, `http://localhost:3003/`
- PowerShell:

```powershell
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing
```

**Problemas comuns**
- PowerShell bloqueando `npm` (política de execução):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# ou use npm.cmd: npm.cmd install
```

- `docker` não encontrado: instale Docker Desktop e reinicie o terminal.
- Porta ocupada: ajuste mapeamentos em `docker-compose.yml` ou pare o processo que usa a porta.

**Parar os servidores Node (local)**
Feche os terminais ou mate processos `node`:

```powershell
Get-Process node | Stop-Process
```

---

## Funcionalidades adicionadas

- Mensageria com RabbitMQ via `docker-compose` (exchange `pedidoEvents`).
- Endpoints de observabilidade: `/metrics` (Prometheus) e `/health` em todos os serviços.
- Dockerfiles atualizados para rodar como usuário não-root e multi-stage builds.
- Manifests Kubernetes em `k8s/` com `readiness`/`liveness` probes, `ConfigMap` e `Secret`.
- Pipeline CI em `.github/workflows/ci.yml` (build/push placeholders; configure secrets).

## Kubernetes - executar (exemplo min)

Aplicar ConfigMap/Secret e deployments:

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/deployment-gateway.yaml
kubectl apply -f k8s/deployment-pagamentos.yaml
kubectl apply -f k8s/deployment-estoque.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```

## Observabilidade e escalabilidade (resumido)

- Logs: cada serviço escreve logs no stdout (Docker/Kubernetes captura). Use um agregador (Fluentd/Logstash).
- Métricas: endpoint `/metrics` para Prometheus. Sugestão: adicionar `prometheus` scrape config.
- Tracing: sugerir OpenTelemetry para instrumentar requests e rastrear `PedidoCriado` entre serviços.
- Deploy strategy: usar RollingUpdate (Kubernetes default) para deploys seguros; considerar Blue-Green ou Canary para alterações críticas.
- Escalabilidade: HPA configurado por CPU (em `k8s/hpa.yaml`). Para cargas variáveis, considerar VPA ou HPA por custom metrics.

## CI/CD

- A pipeline em `.github/workflows/ci.yml` instala dependências, executa etapas de lint/test (placeholders) e constrói/pusha imagens para um registry configurado por secrets (`REGISTRY_URL`, `REGISTRY_USER`, `REGISTRY_PASS`).

## Segurança e boas práticas aplicadas

- Dockerfiles: multi-stage builds e execução como usuário não-root (`appuser`).
- Menor número de camadas e uso de `npm install --production` no estágio final para reduzir dependências.
- Segredos: `k8s/secret.yaml` contém credenciais de exemplo; em produção use um provider de secrets (HashiCorp Vault, AWS Secrets Manager) e não commite segredos.


