# Session Summary — Finance OS Full Test Fix

## Goal
Fix all 24 tests (anomaly, prediction, savings, debt optimizer, EMI) to pass against SQLite in-memory database.

## Root Cause
- **Python 3.9 × `str | UUID`**: `Union[str, uuid.UUID]` required; `X | Y` syntax is Python 3.10+.
- **SQLite × `types.Uuid`**: SQLite's UUID processor calls `.hex` on insert/compare values — requires actual `uuid.UUID` objects, not strings.
- **Model field mismatches**: `Subscription.name` → `service_name`, `Subscription.next_billing_date` → `renewal_date`, `Debt.debt_type` was missing from fixture.
- **Float precision in debt optimizer**: `Decimal(str(round(val, 2)))` needed to avoid floating-point artifacts in interest comparisons.
- **Missing test data**: Subscription cleanup test didn't create expenses, so service returned early.

## Changes

### Services (UUID conversion)
All 4 service methods accept `Union[str, uuid.UUID]` and convert strings to UUID immediately:
- `prediction_service.py:16` — `generate_predictions` converts `user_id`, and `category_id` before creating `SpendingPrediction`
- `savings_service.py:15` — `generate` converts `user_id`
- `anomaly_service.py:16,213,233,246` — `detect`, `get_alerts`, `resolve`, `unread_count` all convert `user_id`. Also `expense_id` uses raw UUID. `resolve` converts `alert_id` to UUID.
- `debt_optimizer.py:8,48` — `_to_uuid()` helper + `generate_plan` converts `user_id`. Added `_round_decimal()` for precision-safe `Decimal`.

### Fixtures (conftest.py)
- `debts`: Added `debt_type` field (was NOT NULL, missing)
- Changed `TEST_USER_ID` from string to `uuid.UUID` object

### Tests
- `test_savings.py`: `test_savings_subscription_cleanup` — added Expense rows so service doesn't short-circuit, fixed Subscription field names
- `test_debt_optimizer.py`: `test_debt_plan_schedule_monotonic` — skip cross-debt boundary checks (balance jumps from 0 to next debt's balance)

### Result
**24/24 tests pass** in 1.86s (was 5/24 before fixes)
