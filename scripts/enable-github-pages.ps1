# One-time setup: enable GitHub Pages (Actions source) for SanthuGitUser/tavekagov.
# Usage: .\scripts\enable-github-pages.ps1 -Pat "github_pat_..."

param(
    [Parameter(Mandatory = $true)]
    [string]$Pat
)

$owner = "SanthuGitUser"
$repo = "tavekagov"
$headers = @{
    Authorization = "Bearer $Pat"
    Accept        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$body = @{
    build_type = "workflow"
} | ConvertTo-Json

Write-Host "Enabling GitHub Pages for $owner/$repo (source: GitHub Actions)..."

try {
    Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$owner/$repo/pages" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json" | Out-Null
    Write-Host "GitHub Pages enabled."
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "GitHub Pages is already enabled. Updating to GitHub Actions source..."
        Invoke-RestMethod `
            -Uri "https://api.github.com/repos/$owner/$repo/pages" `
            -Method Put `
            -Headers $headers `
            -Body $body `
            -ContentType "application/json" | Out-Null
        Write-Host "GitHub Pages updated."
    }
    else {
        throw
    }
}

Write-Host "Done. Re-run the Deploy Web Dashboard workflow on GitHub Actions."
