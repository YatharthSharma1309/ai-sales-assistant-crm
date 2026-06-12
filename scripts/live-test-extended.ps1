$ErrorActionPreference = "Continue"
$Base = "http://localhost:3001"
$results = @()
$suffix = Get-Random -Maximum 999999
$email = "extended$suffix@example.com"
$password = "testpass123"
$newPassword = "newpass456"
$repEmail = "rep$suffix@example.com"

function Test-Step($name, $scriptBlock) {
  try {
    & $scriptBlock
    $script:results += [pscustomobject]@{ Step = $name; Status = "PASS"; Detail = "" }
    Write-Host "[PASS] $name" -ForegroundColor Green
    return $true
  } catch {
    $msg = $_.Exception.Message
    if ($_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message }
    $script:results += [pscustomobject]@{ Step = $name; Status = "FAIL"; Detail = $msg }
    Write-Host "[FAIL] $name - $msg" -ForegroundColor Red
    return $false
  }
}

function Test-ExpectStatus($name, $scriptBlock, $expectedStatus) {
  try {
    & $scriptBlock
    throw "Expected HTTP $expectedStatus but request succeeded"
  } catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -eq $expectedStatus) {
      $script:results += [pscustomobject]@{ Step = $name; Status = "PASS"; Detail = "HTTP $expectedStatus" }
      Write-Host "[PASS] $name (HTTP $expectedStatus)" -ForegroundColor Green
      return $true
    }
    $msg = if ($status) { "Got HTTP $status, expected $expectedStatus" } else { $_.Exception.Message }
    $script:results += [pscustomobject]@{ Step = $name; Status = "FAIL"; Detail = $msg }
    Write-Host "[FAIL] $name - $msg" -ForegroundColor Red
    return $false
  }
}

function Api($Method, $Uri, $Body = $null, $Headers = $script:headers, $ExtraHeaders = @{}) {
  $params = @{
    Uri = $Uri
    Method = $Method
    Headers = $Headers + $ExtraHeaders
    ContentType = "application/json"
  }
  if ($null -ne $Body) { $params.Body = $Body }
  return Invoke-RestMethod @params
}

Write-Host "=== Extended Live Test Suite ===" -ForegroundColor Cyan

# --- Setup ---
Test-Step "Register admin workspace" {
  $body = @{ name = "Admin User"; email = $email; password = $password; organizationName = "Ext Org $suffix" } | ConvertTo-Json
  $script:reg = Api Post "$Base/api/auth/register" $body @{}
  if (-not $script:reg.accessToken -and -not $script:reg.token) { throw "No access token" }
  $access = if ($script:reg.accessToken) { $script:reg.accessToken } else { $script:reg.token }
  $script:headers = @{ Authorization = "Bearer $access" }
  $script:refreshToken = $script:reg.refreshToken
  $script:orgId = $script:reg.organization.id
  $script:userId = $script:reg.user.id
}

Test-ExpectStatus "Duplicate register returns 409" {
  $body = @{ name = "X"; email = $email; password = $password; organizationName = "X" } | ConvertTo-Json
  Api Post "$Base/api/auth/register" $body @{}
} 409

Test-ExpectStatus "Unauthorized without token" {
  Invoke-RestMethod -Uri "$Base/api/auth/me" -Method Get
} 401

Test-Step "Login with credentials" {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $login = Api Post "$Base/api/auth/login" $body @{}
  if (-not $login.accessToken -and -not $login.token) { throw "No login token" }
  $script:refreshToken = $login.refreshToken
}

Test-Step "Refresh access token" {
  if (-not $script:refreshToken) { throw "No refresh token from login" }
  $body = @{ refreshToken = $script:refreshToken } | ConvertTo-Json
  $refreshed = Api Post "$Base/api/auth/refresh" $body @{}
  if (-not $refreshed.accessToken) { throw "No refreshed access token" }
  $script:headers = @{ Authorization = "Bearer $($refreshed.accessToken)" }
  $script:refreshToken = $refreshed.refreshToken
}

Test-Step "Change password" {
  $body = @{ currentPassword = $password; newPassword = $newPassword } | ConvertTo-Json
  Api Post "$Base/api/auth/change-password" $body
  $script:password = $newPassword
}

Test-Step "Login with new password" {
  $body = @{ email = $email; password = $newPassword } | ConvertTo-Json
  $login = Api Post "$Base/api/auth/login" $body @{}
  $access = if ($login.accessToken) { $login.accessToken } else { $login.token }
  $script:headers = @{ Authorization = "Bearer $access" }
  $script:refreshToken = $login.refreshToken
}

Test-ExpectStatus "Switch-org invalid org 403" {
  $body = @{ organizationId = "invalid-org-id" } | ConvertTo-Json
  Api Post "$Base/api/auth/switch-org" $body
} 403

Test-Step "Organization GET and PATCH" {
  $org = Api Get "$Base/api/organization"
  if (-not $org.name) { throw "No org" }
  $body = @{ name = "Ext Org Renamed $suffix" } | ConvertTo-Json
  $patched = Api Patch "$Base/api/organization" $body
  if ($patched.name -notlike "Ext Org Renamed*") { throw "Org not renamed" }
}

Test-Step "Email log regenerate" {
  $before = Api Get "$Base/api/organization/email-log"
  $after = Api Post "$Base/api/organization/email-log/regenerate" "{}"
  if ($before.address -eq $after.address) { throw "Address should change after regenerate" }
  $script:bccAddress = $after.address
}

Test-Step "Dashboard manager-access" {
  $r = Api Get "$Base/api/dashboard/manager-access"
  if ($r.isManager -ne $true) { throw "Admin should be manager" }
}

Test-Step "Dashboard manager endpoint" {
  $r = Api Get "$Base/api/dashboard/manager"
  if ($null -eq $r.team) { throw "Missing team" }
}

Test-Step "Team invite REP (magic link)" {
  $body = @{ name = "Sales Rep"; email = $repEmail; role = "REP" } | ConvertTo-Json
  $script:invite = Api Post "$Base/api/team/invite" $body
  if (-not $script:invite.inviteUrl) { throw "No inviteUrl (dev mode)" }
}

Test-Step "Accept team invite" {
  if ($script:invite.inviteUrl -notmatch 'token=([^&]+)') { throw "Could not parse invite token" }
  $token = [uri]::UnescapeDataString($Matches[1])
  $body = @{ token = $token; name = "Sales Rep"; password = "reppass123" } | ConvertTo-Json
  $accept = Api Post "$Base/api/auth/accept-invite" $body @{}
  if (-not $accept.accessToken -and -not $accept.token) { throw "Accept invite failed" }
}

Test-Step "Team list" {
  $team = Api Get "$Base/api/team"
  if ($team.Count -lt 2) { throw "Expected admin + rep" }
  $script:repMembership = $team | Where-Object { $_.user.email -eq $repEmail } | Select-Object -First 1
}

Test-Step "List pending invites" {
  $invites = Api Get "$Base/api/team/invites"
  if ($null -eq $invites) { throw "No invites response" }
}

Test-Step "Team patch role to MANAGER" {
  $body = @{ role = "MANAGER" } | ConvertTo-Json
  Api Patch "$Base/api/team/$($script:repMembership.id)/role" $body
}

# --- CRM entities ---
Test-Step "Create account + GET detail" {
  $body = @{ name = "Beta Co $suffix"; industry = "FinTech" } | ConvertTo-Json
  $script:account = Api Post "$Base/api/accounts" $body
  $detail = Api Get "$Base/api/accounts/$($script:account.id)"
  if ($detail.name -ne $script:account.name) { throw "Account detail mismatch" }
}

Test-Step "PATCH account" {
  $body = @{ industry = "SaaS" } | ConvertTo-Json
  $r = Api Patch "$Base/api/accounts/$($script:account.id)" $body
  if ($r.industry -ne "SaaS") { throw "Patch failed" }
}

Test-Step "Create contact + GET detail" {
  $body = @{ firstName = "Sam"; lastName = "Lee"; email = "sam$suffix@beta.com"; accountId = $script:account.id } | ConvertTo-Json
  $script:contact = Api Post "$Base/api/contacts" $body
  $detail = Api Get "$Base/api/contacts/$($script:contact.id)"
  if ($detail.email -ne $script:contact.email) { throw "Contact detail mismatch" }
}

Test-Step "PATCH contact" {
  $body = @{ jobTitle = "CTO" } | ConvertTo-Json
  $r = Api Patch "$Base/api/contacts/$($script:contact.id)" $body
  if ($r.jobTitle -ne "CTO") { throw "Contact patch failed" }
}

Test-Step "Leads bulk import" {
  $body = @{
    leads = @(
      @{ title = "Import Lead 1"; source = "CSV"; status = "NEW" },
      @{ title = "Import Lead 2"; source = "CSV"; status = "CONTACTED" }
    )
  } | ConvertTo-Json -Depth 5
  $r = Api Post "$Base/api/leads/import" $body
  if ($r.imported -lt 2) { throw "Expected 2 imported" }
}

Test-Step "Create lead + GET detail" {
  $body = @{ title = "Beta VP Sales"; source = "referral"; contactId = $script:contact.id } | ConvertTo-Json
  $script:lead = Api Post "$Base/api/leads" $body
  $detail = Api Get "$Base/api/leads/$($script:lead.id)"
  if ($detail.score -lt 0) { throw "Score missing" }
}

Test-Step "PATCH lead status" {
  $body = @{ status = "QUALIFIED" } | ConvertTo-Json
  $r = Api Patch "$Base/api/leads/$($script:lead.id)" $body
  if ($r.status -ne "QUALIFIED") { throw "Status not updated" }
}

Test-Step "Recalculate lead scores" {
  $r = Api Post "$Base/api/leads/recalculate-scores" "{}"
  if ($r.updated -lt 1) { throw "No scores updated" }
}

Test-Step "Create multiple deals for pagination" {
  1..18 | ForEach-Object {
    $body = @{ title = "Deal $_ $suffix"; arr = 1000 * $_; stage = "DISCOVERY" } | ConvertTo-Json
    Api Post "$Base/api/deals" $body | Out-Null
  }
  $script:deal = Api Post "$Base/api/deals" (@{ title = "Main Deal"; arr = 50000; contactId = $script:contact.id; accountId = $script:account.id } | ConvertTo-Json)
}

Test-Step "Deals list page 2" {
  $r = Api Get "${Base}/api/deals?page=2&pageSize=10"
  if ($r.pagination.page -ne 2) { throw "Wrong page" }
  if ($r.data.Count -lt 1) { throw "Page 2 empty" }
}

Test-Step "Kanban load-more (page 2 DISCOVERY)" {
  $r = Api Get "${Base}/api/deals/kanban?perStage=5&page_DISCOVERY=2"
  $disc = $r.stages | Where-Object { $_.stage -eq "DISCOVERY" }
  if ($disc.page -ne 2) { throw "DISCOVERY page not 2" }
}

Test-Step "GET deal detail" {
  $d = Api Get "$Base/api/deals/$($script:deal.id)"
  if ($d.title -ne "Main Deal") { throw "Deal detail wrong" }
}

Test-Step "Create TASK activity + PATCH complete" {
  $due = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
  $body = @{ type = "TASK"; title = "Follow up"; leadId = $script:lead.id; dueAt = $due } | ConvertTo-Json
  $script:task = Api Post "$Base/api/activities" $body
  $patch = @{ completed = $true } | ConvertTo-Json
  $updated = Api Patch "$Base/api/activities/$($script:task.id)" $patch
  if (-not $updated.completedAt) { throw "Task not completed" }
}

Test-Step "PATCH activity title" {
  $body = @{ title = "Follow up (done)" } | ConvertTo-Json
  $r = Api Patch "$Base/api/activities/$($script:task.id)" $body
  if ($r.title -ne "Follow up (done)") { throw "Title not updated" }
}

Test-ExpectStatus "Activities without filter 400" {
  Api Get "$Base/api/activities"
} 400

Test-Step "AI context for lead" {
  $r = Api Get "${Base}/api/ai/context?leadId=$($script:lead.id)"
  if (-not $r.contactName -and -not $r.company) { throw "No context fields" }
}

Test-Step "AI summarize meeting (mock)" {
  $body = @{
    title = "Discovery call"
    transcript = "Discussed pricing and timeline. Customer wants demo next week."
    leadId = $script:lead.id
    saveToTimeline = $true
    createTasks = $true
  } | ConvertTo-Json
  $r = Api Post "$Base/api/ai/summarize-meeting" $body
  if (-not $r.summary) { throw "No summary" }
}

Test-Step "GET meetings list" {
  $r = Api Get "$Base/api/meetings"
  if ($r.Count -lt 1) { throw "Expected meeting summary in list" }
}

Test-Step "Communications send (mock Resend)" {
  $body = @{
    to = "sam$suffix@beta.com"
    subject = "Test outreach"
    body = "Hello from live test"
    leadId = $script:lead.id
    logToTimeline = $true
  } | ConvertTo-Json
  $r = Api Post "$Base/api/communications/send" $body
  if ($null -eq $r.sent) { throw "No sent flag" }
}

Test-Step "Inbound email webhook (BCC)" {
  $body = @{
    from = "sam$suffix@beta.com"
    to = $script:bccAddress
    subject = "Re: Pricing"
    text = "Thanks for the info"
    messageId = "test-msg-$suffix"
  } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$Base/api/communications/inbound" -Method Post -Body $body -ContentType "application/json"
  if (-not $r.logged) { throw "Email not logged" }
}

Test-Step "Inbound email duplicate detection" {
  $body = @{
    from = "sam$suffix@beta.com"
    to = $script:bccAddress
    subject = "Re: Pricing"
    text = "Duplicate"
    messageId = "test-msg-$suffix"
  } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$Base/api/communications/inbound" -Method Post -Body $body -ContentType "application/json"
  if (-not $r.duplicate) { throw "Should detect duplicate" }
}

Test-Step "HubSpot CSV import contacts" {
  $csv = "First Name,Last Name,Email,Company Name`nAlex,Smith,alex$suffix@co.com,CSV Corp"
  $body = @{ type = "contacts"; csv = $csv } | ConvertTo-Json
  $r = Api Post "$Base/api/integrations/hubspot/import-csv" $body
  if ($r.contactsCreated -lt 1) { throw "No contacts imported" }
}

Test-Step "HubSpot CSV import deals" {
  $csv = "Deal Name,Deal Stage,Amount,Close Date`nCSV Deal $suffix,qualifiedtobuy,12000,2026-12-31"
  $body = @{ type = "deals"; csv = $csv } | ConvertTo-Json
  $r = Api Post "$Base/api/integrations/hubspot/import-csv" $body
  if ($r.dealsCreated -lt 1) { throw "No deals imported" }
}

Test-Step "Salesforce CSV import leads" {
  $csv = "Company,FirstName,LastName,Email,LeadSource,Status`nSF Co,Jordan,Lee,jordan$suffix@sf.com,Web,Open"
  $body = @{ type = "leads"; csv = $csv } | ConvertTo-Json
  $r = Api Post "$Base/api/integrations/salesforce/import-csv" $body
  if ($r.leadsCreated -lt 1) { throw "No leads imported" }
}

Test-ExpectStatus "HubSpot connect invalid token 400" {
  $body = @{ accessToken = "invalid-token-xyz" } | ConvertTo-Json
  Api Post "$Base/api/integrations/hubspot/connect" $body
} 400

Test-ExpectStatus "Salesforce connect invalid credentials 400" {
  $body = @{ accessToken = "bad"; instanceUrl = "https://example.my.salesforce.com" } | ConvertTo-Json
  Api Post "$Base/api/integrations/salesforce/connect" $body
} 400

Test-ExpectStatus "Cron calendar-sync without secret 401" {
  Invoke-RestMethod -Uri "$Base/api/integrations/cron/calendar-sync" -Method Post -ContentType "application/json"
} 401

Test-Step "Google auth-url (configured or 503)" {
  try {
    $r = Api Get "$Base/api/integrations/google/auth-url"
    if (-not $r.url) { throw "No URL" }
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    if ($status -ne 503) { throw "Expected 503 or URL, got $status" }
  }
}

Test-Step "HubSpot auth-url (configured or 503)" {
  try {
    $r = Api Get "$Base/api/integrations/hubspot/auth-url"
    if (-not $r.url) { throw "No URL" }
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    if ($status -ne 503) { throw "Expected 503 or URL, got $status" }
  }
}

Test-Step "Gmail auth-url (configured or 503)" {
  try {
    $r = Api Get "$Base/api/integrations/gmail/auth-url"
    if (-not $r.url) { throw "No URL" }
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    if ($status -ne 503) { throw "Expected 503 or URL, got $status" }
  }
}

Test-ExpectStatus "Gmail sync not connected 404" {
  Api Post "$Base/api/integrations/gmail/sync" "{}"
} 404

Test-ExpectStatus "HubSpot sync not connected 404" {
  Api Post "$Base/api/integrations/hubspot/sync" "{}"
} 404

Test-ExpectStatus "Google sync not connected 404" {
  Api Post "$Base/api/integrations/google/sync" "{}"
} 404

Test-Step "HubSpot webhook empty batch" {
  $r = Invoke-RestMethod -Uri "$Base/api/integrations/hubspot/webhook" -Method Post -Body "[]" -ContentType "application/json"
  if ($null -eq $r.received) { throw "Bad webhook response" }
}

Test-ExpectStatus "Salesforce webhook missing secret 401" {
  $body = '{"type":"Contact","id":"sf-001","properties":{"FirstName":"A","LastName":"B"}}'
  Invoke-RestMethod -Uri "$Base/api/integrations/salesforce/webhook" -Method Post -Body $body -ContentType "application/json"
} 401

# Seed Salesforce integration via Prisma for webhook test
Test-Step "Salesforce webhook with valid secret (DB seed)" {
  $webhookSecret = "testsecret$suffix"
  $seedScript = @"
import { prisma } from './src/lib/prisma.js';
const orgId = '$($script:orgId)';
const userId = '$($script:userId)';
await prisma.integration.upsert({
  where: { organizationId_userId_provider: { organizationId: orgId, userId, provider: 'SALESFORCE' } },
  create: {
    organizationId: orgId, userId, provider: 'SALESFORCE',
    accessToken: 'test-token', metadata: { instanceUrl: 'https://test.my.salesforce.com', webhookSecret: '$webhookSecret' },
  },
  update: { metadata: { instanceUrl: 'https://test.my.salesforce.com', webhookSecret: '$webhookSecret' } },
});
console.log('seeded');
"@
  $apiDir = Resolve-Path (Join-Path $PSScriptRoot "..\packages\api")
  $seedPath = Join-Path $apiDir "_seed-temp.ts"
  Set-Content -Path $seedPath -Value $seedScript -Encoding UTF8
  Push-Location $apiDir
  npx tsx _seed-temp.ts 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Prisma seed failed" }
  Pop-Location
  Remove-Item $seedPath -ErrorAction SilentlyContinue

  $body = @{
    type = "Contact"
    id = "sf-contact-$suffix"
    properties = @{
      FirstName = "Webhook"
      LastName = "Contact"
      Email = "webhook$suffix@test.com"
      AccountName = "Webhook Corp"
    }
  } | ConvertTo-Json -Depth 5
  $r = Invoke-RestMethod -Uri "$Base/api/integrations/salesforce/webhook" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-salesforce-webhook-secret" = $webhookSecret }
  if (-not $r.received) { throw "Webhook not received" }
}

Test-Step "DELETE activity" {
  Api Delete "$Base/api/activities/$($script:task.id)"
}

Test-Step "DELETE lead (imported)" {
  $leads = Api Get "${Base}/api/leads?q=Import Lead 1"
  $id = $leads.data[0].id
  Api Delete "$Base/api/leads/$id"
}

Test-Step "DELETE main lead" {
  Api Delete "$Base/api/leads/$($script:lead.id)"
}

Test-Step "DELETE deal" {
  Api Delete "$Base/api/deals/$($script:deal.id)"
}

Test-Step "DELETE contact" {
  Api Delete "$Base/api/contacts/$($script:contact.id)"
}

Test-Step "DELETE account" {
  Api Delete "$Base/api/accounts/$($script:account.id)"
}

Test-Step "Team remove member (REP)" {
  Api Delete "$Base/api/team/$($script:repMembership.id)"
}

Write-Host ""
Write-Host "========== EXTENDED TEST SUMMARY ==========" -ForegroundColor Cyan
$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Passed: $passed / $($results.Count)  Failed: $failed"
$results | Format-Table -AutoSize -Wrap
if ($failed -gt 0) { exit 1 }
