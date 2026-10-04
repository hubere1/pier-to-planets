# Windows-Einstieg für `npm run verify` (docs/07 M0). Gleiche Schritte wie in CI.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
npm run verify
exit $LASTEXITCODE
