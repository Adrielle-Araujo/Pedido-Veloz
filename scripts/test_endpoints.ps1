$urls = @('http://localhost:3000/','http://localhost:3001/','http://localhost:3002/','http://localhost:3003/')
foreach ($u in $urls) {
    try {
        $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 5
        Write-Output "== $u =="
        Write-Output ("Status: " + $r.StatusCode)
        Write-Output $r.Content
    } catch {
        Write-Output "== $u =="
        Write-Output ("ERROR: " + $_.Exception.Message)
    }
}
