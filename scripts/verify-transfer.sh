#!/bin/bash
# verify-transfer.sh - 仓库迁移前后验证脚本

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MODE="${1:-pre}"  # pre | post
EVIDENCE_DIR="/tmp/zenithjoy-engine-transfer-evidence"

mkdir -p "$EVIDENCE_DIR"

echo "========================================"
echo "  Repository Transfer Verification"
echo "  Mode: $MODE"
echo "========================================"
echo ""

if [[ "$MODE" == "pre" ]]; then
    echo "Collecting PRE-TRANSFER evidence..."
    echo ""

    # 1. Current repository info
    echo "1. Repository Information"
    gh api repos/perfectuser21/zenithjoy-engine --jq '{
      full_name,
      private,
      owner_type: .owner.type,
      organization: .organization.login
    }' | tee "$EVIDENCE_DIR/repo-info-before.json"
    echo ""

    # 2. Commit count
    echo "2. Commit Count"
    COMMIT_COUNT=$(git rev-list --all --count)
    echo "$COMMIT_COUNT" | tee "$EVIDENCE_DIR/commit-count-before.txt"
    echo "Commits: $COMMIT_COUNT"
    echo ""

    # 3. PR count
    echo "3. Pull Request Count"
    PR_COUNT=$(gh pr list --repo perfectuser21/zenithjoy-engine --state all --json number --jq 'length')
    echo "$PR_COUNT" | tee "$EVIDENCE_DIR/pr-count-before.txt"
    echo "PRs: $PR_COUNT"
    echo ""

    # 4. Issue count
    echo "4. Issue Count"
    ISSUE_COUNT=$(gh issue list --repo perfectuser21/zenithjoy-engine --state all --json number --jq 'length')
    echo "$ISSUE_COUNT" | tee "$EVIDENCE_DIR/issue-count-before.txt"
    echo "Issues: $ISSUE_COUNT"
    echo ""

    # 5. Branch list
    echo "5. Branches"
    git branch -a | tee "$EVIDENCE_DIR/branches-before.txt"
    echo ""

    # 6. Remote URL
    echo "6. Remote URL"
    git remote get-url origin | tee "$EVIDENCE_DIR/remote-url-before.txt"
    echo ""

    # 7. Branch protection (main)
    echo "7. Branch Protection - main"
    gh api repos/perfectuser21/zenithjoy-engine/branches/main/protection --jq '{
      required_status_checks,
      enforce_admins,
      required_pull_request_reviews,
      restrictions,
      allow_force_pushes,
      allow_deletions
    }' | tee "$EVIDENCE_DIR/branch-protection-main-before.json" || echo "No protection"
    echo ""

    # 8. Branch protection (develop)
    echo "8. Branch Protection - develop"
    gh api repos/perfectuser21/zenithjoy-engine/branches/develop/protection --jq '{
      required_status_checks,
      enforce_admins,
      required_pull_request_reviews,
      restrictions,
      allow_force_pushes,
      allow_deletions
    }' | tee "$EVIDENCE_DIR/branch-protection-develop-before.json" || echo "No protection"
    echo ""

    echo -e "${GREEN}✅ PRE-TRANSFER evidence collected${NC}"
    echo "Evidence saved to: $EVIDENCE_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Review the evidence files"
    echo "2. Go to https://github.com/perfectuser21/zenithjoy-engine/settings"
    echo "3. Transfer repository to ZenithJoycloud"
    echo "4. Run: bash scripts/verify-transfer.sh post"

elif [[ "$MODE" == "post" ]]; then
    echo "Collecting POST-TRANSFER evidence and comparing..."
    echo ""

    # Check if pre-transfer evidence exists
    if [[ ! -d "$EVIDENCE_DIR" ]]; then
        echo -e "${RED}❌ No pre-transfer evidence found!${NC}"
        echo "Please run: bash scripts/verify-transfer.sh pre"
        exit 1
    fi

    PASSED=0
    FAILED=0

    # 1. Repository info
    echo "1. Repository Information"
    gh api repos/ZenithJoycloud/zenithjoy-engine --jq '{
      full_name,
      private,
      owner_type: .owner.type,
      organization: .organization.login
    }' | tee "$EVIDENCE_DIR/repo-info-after.json"

    # Check: private
    PRIVATE=$(gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.private')
    if [[ "$PRIVATE" == "true" ]]; then
        echo -e "${GREEN}  ✅ Repository is PRIVATE${NC}"
        ((PASSED++))
    else
        echo -e "${RED}  ❌ Repository is PUBLIC!${NC}"
        ((FAILED++))
    fi

    # Check: owner type
    OWNER_TYPE=$(gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.owner.type')
    if [[ "$OWNER_TYPE" == "Organization" ]]; then
        echo -e "${GREEN}  ✅ Owner is Organization${NC}"
        ((PASSED++))
    else
        echo -e "${RED}  ❌ Owner type is $OWNER_TYPE${NC}"
        ((FAILED++))
    fi

    # Check: organization field
    ORG=$(gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.organization.login // "null"')
    if [[ "$ORG" == "ZenithJoycloud" ]]; then
        echo -e "${GREEN}  ✅ Organization field correct${NC}"
        ((PASSED++))
    else
        echo -e "${RED}  ❌ Organization is $ORG${NC}"
        ((FAILED++))
    fi
    echo ""

    # 2. Update remote URL
    echo "2. Updating Remote URL"
    git remote set-url origin https://github.com/ZenithJoycloud/zenithjoy-engine.git
    git fetch origin
    git remote get-url origin | tee "$EVIDENCE_DIR/remote-url-after.txt"
    echo -e "${GREEN}  ✅ Remote URL updated${NC}"
    ((PASSED++))
    echo ""

    # 3. Commit count
    echo "3. Commit Count"
    COMMIT_COUNT_BEFORE=$(cat "$EVIDENCE_DIR/commit-count-before.txt")
    COMMIT_COUNT_AFTER=$(git rev-list --all --count)
    echo "$COMMIT_COUNT_AFTER" > "$EVIDENCE_DIR/commit-count-after.txt"
    echo "  Before: $COMMIT_COUNT_BEFORE"
    echo "  After:  $COMMIT_COUNT_AFTER"
    if [[ "$COMMIT_COUNT_BEFORE" -eq "$COMMIT_COUNT_AFTER" ]]; then
        echo -e "${GREEN}  ✅ Commit count unchanged${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}  ⚠️  Commit count changed!${NC}"
        ((FAILED++))
    fi
    echo ""

    # 4. PR count
    echo "4. Pull Request Count"
    PR_COUNT_BEFORE=$(cat "$EVIDENCE_DIR/pr-count-before.txt")
    PR_COUNT_AFTER=$(gh pr list --repo ZenithJoycloud/zenithjoy-engine --state all --json number --jq 'length')
    echo "$PR_COUNT_AFTER" > "$EVIDENCE_DIR/pr-count-after.txt"
    echo "  Before: $PR_COUNT_BEFORE"
    echo "  After:  $PR_COUNT_AFTER"
    if [[ "$PR_COUNT_BEFORE" -eq "$PR_COUNT_AFTER" ]]; then
        echo -e "${GREEN}  ✅ PR count unchanged${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}  ⚠️  PR count changed!${NC}"
        ((FAILED++))
    fi
    echo ""

    # 5. Issue count
    echo "5. Issue Count"
    ISSUE_COUNT_BEFORE=$(cat "$EVIDENCE_DIR/issue-count-before.txt")
    ISSUE_COUNT_AFTER=$(gh issue list --repo ZenithJoycloud/zenithjoy-engine --state all --json number --jq 'length')
    echo "$ISSUE_COUNT_AFTER" > "$EVIDENCE_DIR/issue-count-after.txt"
    echo "  Before: $ISSUE_COUNT_BEFORE"
    echo "  After:  $ISSUE_COUNT_AFTER"
    if [[ "$ISSUE_COUNT_BEFORE" -eq "$ISSUE_COUNT_AFTER" ]]; then
        echo -e "${GREEN}  ✅ Issue count unchanged${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}  ⚠️  Issue count changed!${NC}"
        ((FAILED++))
    fi
    echo ""

    # 6. Branches
    echo "6. Branches"
    git branch -a > "$EVIDENCE_DIR/branches-after.txt"
    if diff -q "$EVIDENCE_DIR/branches-before.txt" "$EVIDENCE_DIR/branches-after.txt" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ All branches preserved${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}  ⚠️  Branch differences detected${NC}"
        echo "  Run: diff $EVIDENCE_DIR/branches-before.txt $EVIDENCE_DIR/branches-after.txt"
        ((FAILED++))
    fi
    echo ""

    # 7. Branch protection check (should be reset after transfer)
    echo "7. Branch Protection Status"
    echo "  Note: Branch protection may be reset after transfer and needs reconfiguration in Phase 3"

    MAIN_PROTECTED=$(gh api repos/ZenithJoycloud/zenithjoy-engine/branches/main/protection 2>&1 | grep -q "Not Found" && echo "false" || echo "true")
    if [[ "$MAIN_PROTECTED" == "true" ]]; then
        echo -e "${GREEN}  ✅ main branch protection preserved${NC}"
        gh api repos/ZenithJoycloud/zenithjoy-engine/branches/main/protection > "$EVIDENCE_DIR/branch-protection-main-after.json"
        ((PASSED++))
    else
        echo -e "${YELLOW}  ⚠️  main branch protection needs reconfiguration (expected after transfer)${NC}"
        # Not counted as failure - this is expected
    fi

    DEVELOP_PROTECTED=$(gh api repos/ZenithJoycloud/zenithjoy-engine/branches/develop/protection 2>&1 | grep -q "Not Found" && echo "false" || echo "true")
    if [[ "$DEVELOP_PROTECTED" == "true" ]]; then
        echo -e "${GREEN}  ✅ develop branch protection preserved${NC}"
        gh api repos/ZenithJoycloud/zenithjoy-engine/branches/develop/protection > "$EVIDENCE_DIR/branch-protection-develop-after.json"
        ((PASSED++))
    else
        echo -e "${YELLOW}  ⚠️  develop branch protection needs reconfiguration (expected after transfer)${NC}"
        # Not counted as failure - this is expected
    fi
    echo ""

    # Summary
    echo "========================================"
    echo "  VERIFICATION SUMMARY"
    echo "========================================"
    echo -e "Passed: ${GREEN}$PASSED${NC}"
    echo -e "Failed: ${RED}$FAILED${NC}"
    echo ""

    if [[ $FAILED -eq 0 ]]; then
        echo -e "${GREEN}✅ Repository transfer VERIFIED${NC}"
        echo ""
        echo "Evidence saved to: $EVIDENCE_DIR"
        echo ""
        echo "Next steps:"
        echo "1. Update REPO-TRANSFER.md with verification results"
        echo "2. Proceed to Phase 3: A+ Zero-Escape implementation"
        exit 0
    else
        echo -e "${RED}❌ Repository transfer FAILED verification${NC}"
        echo ""
        echo "Please review:"
        echo "  - Evidence files in $EVIDENCE_DIR"
        echo "  - GitHub transfer status"
        echo "  - Consider rollback if critical data is missing"
        exit 1
    fi

else
    echo "Usage: $0 [pre|post]"
    echo ""
    echo "  pre  - Collect evidence before transfer"
    echo "  post - Verify transfer and collect evidence after"
    exit 1
fi
