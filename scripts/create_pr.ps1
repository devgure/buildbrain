param(
  [string]$Branch = "feature/ci-node-python",
  [string]$Files = ".github/workflows/ci.yml .github/workflows/node-tests.yml",
  [string]$Title = "CI: add Node matrix + Python tests",
  [string]$Body = "Adds CI workflows: Node Jest matrix with npm cache and Python pytest with pip cache."
)

git checkout -b $Branch
git add $Files
git commit -m $Title
git push --set-upstream origin $Branch

if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh pr create --title $Title --body $Body --base main
} else {
  Write-Host "gh CLI not found. Create PR manually or install gh: https://cli.github.com/"
}
