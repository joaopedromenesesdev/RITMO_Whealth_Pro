<#
.SYNOPSIS
    Script automatizado para envio em lote de convites por e-mail aos assessores do piloto Pace Capital.
.DESCRIPTION
    Utiliza a GoTrue Admin API do Supabase para disparar convites nativos (Opção B).
    Ao clicar no link do e-mail recebido, cada assessor é direcionado para a tela oficial "Ativar sua Conta"
    em login.html para definir sua senha própria e acessar a plataforma.
.PARAMETER ServiceRoleKey
    A chave secreta 'service_role' do seu projeto Supabase (disponível em Project Settings -> API).
.PARAMETER RedirectTo
    URL de redirecionamento para login.html onde o assessor criará sua senha.
.EXAMPLE
    .\convidar_piloto.ps1 -ServiceRoleKey "sua_service_role_key_aqui"
#>

param(
    [Parameter(Mandatory=$true, HelpMessage="Insira a service_role key do Supabase")]
    [string]$ServiceRoleKey,

    [string]$RedirectTo = "https://dogyopoylekiqsahadlc.supabase.co/login.html"
)

$SupabaseUrl = "https://dogyopoylekiqsahadlc.supabase.co"
$Endpoint = "$SupabaseUrl/auth/v1/invite"

$PilotoAssessores = @(
    @{ email = "lguilherme.valim@pacecapital.com.br"; nome = "Guilherme Valim" },
    @{ email = "solange.bastos@pacecapital.com.br";   nome = "Solange Bastos" },
    @{ email = "dayane.cugliari@pacecapital.com.br";  nome = "Dayane Cugliari" },
    @{ email = "fernanda.campos@pacecapital.com.br";  nome = "Fernanda Campos" },
    @{ email = "matheus.bonetto@pacecapital.com.br";  nome = "Matheus Bonetto" }
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " PACE CAPITAL — DISPARO DE CONVITES DO PILOTO (OPÇÃO B)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Supabase URL: $SupabaseUrl"
Write-Host "Redirect To:  $RedirectTo"
Write-Host "Total:        $($PilotoAssessores.Count) assessores"
Write-Host "--------------------------------------------------------"

$encodedRedirect = [System.Uri]::EscapeDataString($RedirectTo)
$inviteUrl = "$Endpoint`?redirect_to=$encodedRedirect"

$headers = @{
    "apikey"        = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type"  = "application/json"
}

$sucessos = 0
$falhas = 0

foreach ($assessor in $PilotoAssessores) {
    $payload = @{
        email = $assessor.email
        data  = @{
            full_name = $assessor.nome
        }
    } | ConvertTo-Json -Compress

    try {
        Write-Host "Enviando convite para $($assessor.nome) <$($assessor.email)>..." -NoNewline
        $resp = Invoke-RestMethod -Uri $inviteUrl -Method Post -Headers $headers -Body $payload
        Write-Host " [OK]" -ForegroundColor Green
        $sucessos++
    } catch {
        Write-Host " [FALHA]" -ForegroundColor Red
        $errorMsg = $_.Exception.Message
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $errorMsg = $_.ErrorDetails.Message
        }
        Write-Host "  Detalhes: $errorMsg" -ForegroundColor Yellow
        $falhas++
    }
}

Write-Host "--------------------------------------------------------"
Write-Host "Resultado: $sucessos enviados com sucesso, $falhas falhas." -ForegroundColor $(if ($falhas -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================================" -ForegroundColor Cyan
