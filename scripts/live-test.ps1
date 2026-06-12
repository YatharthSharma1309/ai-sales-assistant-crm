$ErrorActionPreference = "Stop"
$Base = "http://localhost:3001"
$results = @()
$suffix = Get-Random -Maximum 99999
$email = "livetest$suffix@example.com"
$password = "testpass123"
$orgName = "Live Test Org $suffix"

function Test-Step($name, $scriptBlock) {
  try {
    & $scriptBlock
    $script:results += [pscustomobject]@{ Step = $name; Status = "PASS"; Detail = "" }
    Write-Host "[PASS] $name" -ForegroundColor Green
  } catch {
    $msg = $_.Exception.Message
    $script:results += [pscustomobject]@{ Step = $name; Status = "FAIL"; Detail = $msg }
    Write-Host "[FAIL] $name - $msg" -ForegroundColor Red
  }
}

Test-Step "Health check" {
  $r = Invoke-RestMethod -Uri "$Base/api/health" -Method Get
  if ($r.status -ne "ok") { throw "Unexpected health response" }
}

Test-Step "Register workspace" {
  $body = @{ name = "Test User"; email = $email; password = $password; organizationName = $orgName } | ConvertTo-Json
  $script:reg = Invoke-RestMethod -Uri "$Base/api/auth/register" -Method Post -Body $body -ContentType "application/json"
  if (-not $script:reg.token) { throw "No token returned" }
  $script:headers = @{ Authorization = "Bearer $($script:reg.token)" }
}

Test-Step "GET /api/auth/me" {
  $me = Invoke-RestMethod -Uri "$Base/api/auth/me" -Headers $script:headers
  if ($me.user.email -ne $email) { throw "Email mismatch" }
}

Test-Step "PATCH /api/auth/me" {
  $body = @{ name = "Updated User" } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$Base/api/auth/me" -Method Patch -Headers $script:headers -Body $body -ContentType "application/json"
  if ($r.user.name -ne "Updated User") { throw "Name not updated" }
}

Test-Step "Create account" {
  $body = @{ name = "Acme Corp $suffix"; industry = "SaaS" } | ConvertTo-Json
  $script:account = Invoke-RestMethod -Uri "$Base/api/accounts" -Method Post -Headers $script:headers -Body $body -ContentType "application/json"
}

Test-Step "Paginated accounts list" {
  $r = Invoke-RestMethod -Uri "$Base/api/accounts?page=1&pageSize=10" -Headers $script:headers
  if (-not $r.data -or -not $r.pagination) { throw "Missing pagination envelope" }
  if ($r.pagination.page -ne 1) { throw "Wrong page" }
}

Test-Step "Create contact" {
  $body = @{ firstName = "Jane"; lastName = "Doe"; email = "jane$suffix@acme.com"; accountId = $script:account.id } | ConvertTo-Json
  $script:contact = Invoke-RestMethod -Uri "$Base/api/contacts" -Method Post -Headers $script:headers -Body $body -ContentType "application/json"
}

Test-Step "Create lead" {
  $body = @{ title = "Acme VP Eng"; source = "referral"; contactId = $script:contact.id } | ConvertTo-Json
  $script:lead = Invoke-RestMethod -Uri "$Base/api/leads" -Method Post -Headers $script:headers -Body $body -ContentType "application/json"
  if ($null -eq $script:lead.score) { throw "Lead score missing" }
}

Test-Step "Paginated leads list" {
  $r = Invoke-RestMethod -Uri "${Base}/api/leads?page=1&pageSize=5" -Headers $script:headers
  if ($r.data.Count -lt 1) { throw "No leads in paginated response" }
}

Test-Step "Create deal" {
  $body = @{ title = "Acme Annual"; arr = 24000; stage = "DISCOVERY"; contactId = $script:contact.id; accountId = $script:account.id } | ConvertTo-Json
  $script:deal = Invoke-RestMethod -Uri "$Base/api/deals" -Method Post -Headers $script:headers -Body $body -ContentType "application/json"
}

Test-Step "Kanban deals endpoint" {
  $r = Invoke-RestMethod -Uri "$Base/api/deals/kanban?perStage=10" -Headers $script:headers
  if (-not $r.stages -or $r.stages.Count -lt 1) { throw "No kanban stages" }
  $discovery = $r.stages | Where-Object { $_.stage -eq "DISCOVERY" }
  if ($discovery.deals.Count -lt 1) { throw "Deal not in DISCOVERY column" }
}

Test-Step "Dashboard stats" {
  $r = Invoke-RestMethod -Uri "$Base/api/dashboard/stats" -Headers $script:headers
  if ($r.leadCount -lt 1) { throw "leadCount should be >= 1" }
}

Test-Step "Dashboard forecast" {
  $r = Invoke-RestMethod -Uri "$Base/api/dashboard/forecast" -Headers $script:headers
  if ($null -eq $r.pipelineHealth) { throw "Missing pipelineHealth" }
}

Test-Step "Create activity on lead" {
  $body = @{ type = "CALL"; title = "Discovery call"; leadId = $script:lead.id } | ConvertTo-Json
  $script:activity = Invoke-RestMethod -Uri "$Base/api/activities" -Method Post -Headers $script:headers -Body $body -ContentType "application/json"
}

Test-Step "Paginated activities" {
  $leadId = $script:lead.id
  $r = Invoke-RestMethod -Uri "${Base}/api/activities?leadId=${leadId}&page=1&pageSize=10" -Headers $script:headers
  if ($r.data.Count -lt 1) { throw "No activities returned" }
}

Test-Step "AI generate email (mock)" {
  $body = @{ leadId = $script:lead.id; tone = "professional" } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$Base/api/ai/generate-email" -Method Post -Headers $script:headers -Body $body -ContentType "application/json"
  if (-not $r.subject -or -not $r.body) { throw "No draft returned" }
}

Test-Step "Integrations status" {
  $r = Invoke-RestMethod -Uri "$Base/api/integrations/status" -Headers $script:headers
  if ($null -eq $r.hubspot.webhookUrl) { throw "Missing hubspot webhookUrl" }
}

Test-Step "Email log address" {
  $r = Invoke-RestMethod -Uri "$Base/api/organization/email-log" -Headers $script:headers
  if (-not $r.address) { throw "No BCC address" }
}

Test-Step "Onboarding status" {
  $r = Invoke-RestMethod -Uri "$Base/api/dashboard/onboarding" -Headers $script:headers
  if (-not $r.steps.hasLead) { throw "Onboarding should detect lead" }
}

Test-Step "Update deal stage" {
  $body = @{ stage = "PROPOSAL" } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$Base/api/deals/$($script:deal.id)" -Method Patch -Headers $script:headers -Body $body -ContentType "application/json"
  if ($r.stage -ne "PROPOSAL") { throw "Stage not updated" }
}

Write-Host ""
Write-Host "========== LIVE TEST SUMMARY ==========" -ForegroundColor Cyan
$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Passed: $passed / $($results.Count)  Failed: $failed"
$results | Format-Table -AutoSize
if ($failed -gt 0) { exit 1 }
