param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceRoleKey,

    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html"
)

$SupabaseUrl = "https://dogyopoylekiqsahadlc.supabase.co"
$Endpoint = "$SupabaseUrl/auth/v1/admin/generate_link"

$PilotoAssessores = @(
    @{ email = "lguilherme.valim@pacecapital.com.br"; nome = "Guilherme Valim" },
    @{ email = "solange.bastos@pacecapital.com.br";   nome = "Solange Bastos" },
    @{ email = "dayane.cugliari@pacecapital.com.br";  nome = "Dayane Cugliari" },
    @{ email = "fernanda.campos@pacecapital.com.br";  nome = "Fernanda Campos" },
    @{ email = "matheus.bonetto@pacecapital.com.br";  nome = "Matheus Bonetto" }
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " PACE CAPITAL - GERADOR DE LINKS DE ATIVACAO DE SENHA (PILOTO)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "URL de Redirecionamento: $BaseUrl"
Write-Host "Gerando links para $($PilotoAssessores.Count) assessores..."
Write-Host "-----------------------------------------------------------------"

$headers = @{
    "apikey"        = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type"  = "application/json"
}

$resultados = @()

foreach ($assessor in $PilotoAssessores) {
    $body = @{
        type = "invite"
        email = $assessor.email
        data = @{ full_name = $assessor.nome }
        options = @{ redirectTo = $BaseUrl }
    } | ConvertTo-Json -Compress

    $linkGerado = $null
    $tipoUsado = "invite"

    try {
        $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -Headers $headers -Body $body
        if ($resp.action_link) { $linkGerado = $resp.action_link }
        elseif ($resp.properties -and $resp.properties.action_link) { $linkGerado = $resp.properties.action_link }
    } catch {
        # Se usuario ja estiver registrado no Auth, gera via recovery
        $tipoUsado = "recovery"
        $bodyRecovery = @{
            type = "recovery"
            email = $assessor.email
            options = @{ redirectTo = $BaseUrl }
        } | ConvertTo-Json -Compress

        try {
            $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -Headers $headers -Body $bodyRecovery
            if ($resp.action_link) { $linkGerado = $resp.action_link }
            elseif ($resp.properties -and $resp.properties.action_link) { $linkGerado = $resp.properties.action_link }
        } catch {
            Write-Host "[ERRO] Falha ao gerar link para $($assessor.email): $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    if ($linkGerado) {
        $resultados += [PSCustomObject]@{
            Nome  = $assessor.nome
            Email = $assessor.email
            Tipo  = $tipoUsado
            Link  = $linkGerado
        }
    }
}

Write-Host "`nLINKS GERADOS COM SUCESSO!`n" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor DarkGray

foreach ($r in $resultados) {
    Write-Host "`nAssessor: $($r.Nome) ($($r.Email))" -ForegroundColor Yellow
    Write-Host "Link de Ativacao:" -ForegroundColor White
    Write-Host "$($r.Link)" -ForegroundColor Cyan
    Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
}
