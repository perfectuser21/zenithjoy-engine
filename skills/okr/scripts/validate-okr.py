#!/usr/bin/env python3
"""
OKR Validation Script with Anti-Cheating (v7.0.0)
- Calculates content hash to prevent score tampering
- Validates form (structure/fields)
- Generates validation report for AI self-assessment
"""

import json
import sys
import hashlib
from datetime import datetime
from pathlib import Path


def calculate_content_hash(data):
    """Calculate SHA256 hash of output.json content"""
    content_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(content_str.encode()).hexdigest()[:16]


def detect_circular_dependency(pr_plans):
    """Detect circular dependencies in PR Plans"""
    # Build dependency graph
    plan_map = {p.get('sequence', idx + 1): idx for idx, p in enumerate(pr_plans)}

    def has_cycle(seq, visited, rec_stack):
        visited.add(seq)
        rec_stack.add(seq)

        if seq not in plan_map:
            return False

        plan = pr_plans[plan_map[seq]]
        depends_on = plan.get('depends_on', [])

        for dep in depends_on:
            if dep not in visited:
                if has_cycle(dep, visited, rec_stack):
                    return True
            elif dep in rec_stack:
                return True

        rec_stack.remove(seq)
        return False

    visited = set()
    for idx, plan in enumerate(pr_plans):
        seq = plan.get('sequence', idx + 1)
        if seq not in visited:
            if has_cycle(seq, visited, set()):
                return True
    return False


def validate_3layer_format(data):
    """Validate 3-layer decomposition format (Initiative → PR Plans → Tasks)"""
    score = 0
    issues = []
    suggestions = []

    # 1. Initiative required fields (10 points)
    initiative = data.get('initiative', {})
    required_initiative_fields = ['title', 'description', 'repository']
    initiative_complete = all(k in initiative for k in required_initiative_fields)

    if initiative_complete:
        score += 10
    else:
        missing = [k for k in required_initiative_fields if k not in initiative]
        issues.append(f"Initiative missing: {', '.join(missing)}")
        suggestions.append(f"Add {', '.join(missing)} to initiative field")

    # 2. PR Plans exist (10 points)
    pr_plans = data.get('pr_plans', [])
    if len(pr_plans) > 0:
        score += 10
    else:
        issues.append("No PR Plans defined")
        suggestions.append("Decompose Initiative into 2-5 PR Plans")

    # 3. PR Plan field completeness (20 points)
    if pr_plans:
        complete_count = 0
        for idx, plan in enumerate(pr_plans):
            required = ['title', 'dod', 'files', 'complexity']
            plan_complete = all(k in plan for k in required)

            # Validate dod (at least 2 criteria)
            dod = plan.get('dod', [])
            if not isinstance(dod, list) or len(dod) < 2:
                issues.append(f"PR Plan #{idx+1} '{plan.get('title', 'unknown')}': dod needs at least 2 criteria (found {len(dod)})")
                suggestions.append(f"Add more acceptance criteria to PR Plan #{idx+1}")
                plan_complete = False

            # Validate files (at least 1 file)
            files = plan.get('files', [])
            if not isinstance(files, list) or len(files) < 1:
                issues.append(f"PR Plan #{idx+1} '{plan.get('title', 'unknown')}': files needs at least 1 file")
                suggestions.append(f"Add file paths to PR Plan #{idx+1}")
                plan_complete = False

            # Validate complexity (low/medium/high)
            complexity = plan.get('complexity', '')
            if complexity not in ['low', 'medium', 'high']:
                issues.append(f"PR Plan #{idx+1} '{plan.get('title', 'unknown')}': invalid complexity '{complexity}' (must be low/medium/high)")
                suggestions.append(f"Set complexity to low/medium/high for PR Plan #{idx+1}")
                plan_complete = False

            # Validate depends_on references
            depends_on = plan.get('depends_on', [])
            if depends_on:
                valid_sequences = set(p.get('sequence', i+1) for i, p in enumerate(pr_plans))
                for dep in depends_on:
                    if dep not in valid_sequences:
                        issues.append(f"PR Plan #{idx+1}: depends_on references non-existent sequence {dep}")
                        suggestions.append(f"Remove or fix invalid dependency in PR Plan #{idx+1}")
                        plan_complete = False

            # Validate tasks exist
            tasks = plan.get('tasks', [])
            if len(tasks) < 1:
                issues.append(f"PR Plan #{idx+1} '{plan.get('title', 'unknown')}': needs at least 1 task")
                suggestions.append(f"Add tasks to PR Plan #{idx+1}")
                plan_complete = False

            if plan_complete:
                complete_count += 1

        completeness_ratio = complete_count / len(pr_plans) if pr_plans else 0
        score += int(20 * completeness_ratio)

    # 4. Circular dependency check
    if pr_plans and detect_circular_dependency(pr_plans):
        issues.append("Circular dependency detected in PR Plans (depends_on)")
        suggestions.append("Review and break circular dependencies in depends_on fields")
        # Don't deduct points, just flag the issue

    return {
        'score': min(score, 40),
        'issues': issues,
        'suggestions': suggestions,
        'num_pr_plans': len(pr_plans),
        'format': '3-layer'
    }


def validate_2layer_format(data):
    """Validate 2-layer format (Features → Tasks) - backward compatible"""
    score = 0
    issues = []
    suggestions = []

    # 1. Required fields (10 points)
    if 'objective' in data:
        score += 5
    else:
        issues.append("Missing 'objective' field")
        suggestions.append("Add 'objective' field with clear goal statement")

    if 'key_results' in data:
        score += 5
    else:
        issues.append("Missing 'key_results' field")
        suggestions.append("Add 'key_results' array with at least 2 KRs")

    # 2. KR count (5 points)
    krs = data.get('key_results', [])
    if len(krs) >= 2:
        score += 5
    else:
        issues.append(f"Need at least 2 Key Results (found {len(krs)})")
        suggestions.append("Add more Key Results to achieve the Objective")

    # 3. Features exist (10 points)
    all_features = []
    for kr in krs:
        if 'features' in kr:
            all_features.extend(kr['features'])

    if all_features:
        score += 10
    else:
        issues.append("No Features defined for any KR")
        suggestions.append("Decompose each KR into 2-5 Features")

    # 4. Feature field completeness (15 points)
    if all_features:
        complete_count = 0
        for feat in all_features:
            required = ['title', 'description', 'repository']
            if all(k in feat for k in required):
                complete_count += 1
            else:
                missing = [k for k in required if k not in feat]
                feat_title = feat.get('title', 'unknown')
                issues.append(f"Feature '{feat_title}' missing: {', '.join(missing)}")
                suggestions.append(f"Add {', '.join(missing)} to Feature '{feat_title}'")

        completeness_ratio = complete_count / len(all_features)
        score += int(15 * completeness_ratio)

    return {
        'score': min(score, 40),
        'issues': issues,
        'suggestions': suggestions,
        'num_features': len(all_features),
        'format': '2-layer'
    }


def validate_okr_form(data):
    """Form validation (automated, 40 points max) - auto-detect format"""
    # Detect format
    has_pr_plans = 'initiative' in data and 'pr_plans' in data

    if has_pr_plans:
        return validate_3layer_format(data)
    else:
        return validate_2layer_format(data)


def main():
    if len(sys.argv) < 2:
        print("Usage: validate-okr.py <output.json>")
        print("\nExample:")
        print("  python3 validate-okr.py output.json")
        sys.exit(1)

    input_file = Path(sys.argv[1])

    if not input_file.exists():
        print(f"❌ Error: {input_file} not found")
        sys.exit(1)

    # Read data
    try:
        with open(input_file) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {input_file}")
        print(f"   {e}")
        sys.exit(1)

    # Form validation
    form_result = validate_okr_form(data)

    # Calculate content hash
    content_hash = calculate_content_hash(data)

    # Generate report (content_score to be filled by AI)
    report = {
        'form_score': form_result['score'],
        'content_score': 0,  # AI self-assessment (0-60)
        'content_breakdown': {
            'title_quality': 0,
            'description_quality': 0,
            'kr_feature_mapping': 0,
            'completeness': 0
        },
        'total': form_result['score'],  # form + content
        'passed': False,  # total >= 90
        'content_hash': content_hash,
        'timestamp': datetime.now().isoformat(),
        'issues': form_result['issues'],
        'suggestions': form_result['suggestions'],
        'format': form_result.get('format', 'unknown'),
        'details': {
            'num_features': form_result.get('num_features', 0),
            'num_pr_plans': form_result.get('num_pr_plans', 0)
        }
    }

    # Save report
    report_file = input_file.parent / 'validation-report.json'
    with open(report_file, 'w') as f:
        json.dump(report, indent=2, fp=f)

    # Output results
    print(f"\n{'='*60}")
    print(f"  OKR Validation Report")
    print(f"{'='*60}")
    print(f"  Form score:       {report['form_score']}/40")
    print(f"  Content score:    {report['content_score']}/60 (AI to fill)")
    print(f"  Total:            {report['total']}/100")
    print(f"  Content hash:     {content_hash}")
    print(f"  Timestamp:        {report['timestamp']}")
    print(f"{'='*60}")

    if report['issues']:
        print(f"\n⚠️  Issues found ({len(report['issues'])}):")
        for issue in report['issues']:
            print(f"  - {issue}")

    if report['suggestions']:
        print(f"\n💡 Suggestions:")
        for suggestion in report['suggestions']:
            print(f"  - {suggestion}")

    if report['content_score'] == 0:
        print(f"\n📝 Next step:")
        print(f"  AI: Please assess content quality and update validation-report.json")
        print(f"  - Set content_score (0-60)")
        print(f"  - Fill content_breakdown (each 0-15)")
        print(f"  - Update total = form_score + content_score")
        print(f"  - Set passed = true if total >= 90")

    if report['passed']:
        print(f"\n✅ Validation PASSED")
        sys.exit(0)
    else:
        print(f"\n❌ Validation not yet complete")
        print(f"   (Re-run after content assessment)")
        sys.exit(1)


if __name__ == '__main__':
    main()
