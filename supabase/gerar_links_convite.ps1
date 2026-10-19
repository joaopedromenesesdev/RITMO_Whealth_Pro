param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceRoleKey,

    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html"
)

$SupabaseUrl = "https://dogyopoylekiqsahadlc.supabase.co"
$Endpoint = "$SupabaseUrl/auth/v1/admin/generate_link"

$PilotoAssessores = @(
    @{ email = "assessor.piloto1@pacecapital.com.br"; nome = "Assessor Piloto 1" },
    @{ email = "assessor.piloto2@pacecapital.com.br";   nome = "Assessor Piloto 2" },
    @{ email = "assessor.piloto3@pacecapital.com.br";  nome = "Assessor Piloto 3" },
    @{ email = "assessor.piloto4@pacecapital.com.br";  nome = "Assessor Piloto 4" },
    @{ email = "assessor.piloto5@pacecapital.com.br";  nome = "Assessor Piloto 5" }
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
