# Cleans emoji/symbol markers in markdown docs and replaces them with plain-text equivalents.
# Note: repository rule forbids emoji in docs/comments; this script operates on docs only.

param(
  [Parameter(Mandatory = $true)]
  [string] $Path
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path -LiteralPath $Path)) {
  Write-Error "File not found: $Path"
  exit 2
}

$ok     = [char]0x2705 # white heavy check mark
$no     = [char]0x274C # cross mark
$hour   = [char]0x23F3 # hourglass not done
$warn   = [char]0x26A0 # warning sign
$vs16   = [char]0xFE0F # variation selector-16
$memo   = [System.Char]::ConvertFromUtf32(0x1F4DD) # memo
$target = [System.Char]::ConvertFromUtf32(0x1F3AF) # direct hit

$lb = [char]0x3010 # 【
$rb = [char]0x3011 # 】
$notice = $lb + ([char]0x6CE8) + ([char]0x610F) + $rb   # 注意
$todoWrite = $lb + ([char]0x5F85) + ([char]0x5199) + $rb # 待写

$t = Get-Content -LiteralPath $Path -Raw

$t = $t.Replace([string]$ok, '[x]')
$t = $t.Replace([string]$no, '[ ]')
$t = $t.Replace([string]$hour, $todoWrite)
$t = $t.Replace(([string]$warn + [string]$vs16), $notice)
$t = $t.Replace([string]$warn, $notice)
$t = $t.Replace($memo, '')
$t = $t.Replace($target, '')

Set-Content -LiteralPath $Path -Value $t -Encoding utf8

Write-Host "Cleaned: $Path"

