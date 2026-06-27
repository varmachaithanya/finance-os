from app.services.debt_optimizer import DebtOptimizerService


def test_debt_optimizer_generates_plan(db_session, user, debts):
    service = DebtOptimizerService(db_session)
    plan = service.generate_plan(str(user.id))
    assert plan.snowball.months_to_debt_free > 0
    assert plan.avalanche.months_to_debt_free > 0
    assert plan.snowball.total_interest_paid > 0
    assert plan.avalanche.total_interest_paid > 0


def test_debt_avalanche_better_or_equal(db_session, user, debts):
    service = DebtOptimizerService(db_session)
    plan = service.generate_plan(str(user.id))
    assert plan.avalanche.total_interest_paid <= plan.snowball.total_interest_paid


def test_debt_snowball_has_schedule(db_session, user, debts):
    service = DebtOptimizerService(db_session)
    plan = service.generate_plan(str(user.id))
    assert len(plan.snowball.schedule) > 0
    assert len(plan.avalanche.schedule) > 0


def test_debt_optimizer_no_debts(db_session, user):
    service = DebtOptimizerService(db_session)
    plan = service.generate_plan(str(user.id))
    assert plan.snowball.months_to_debt_free == 0
    assert plan.avalanche.months_to_debt_free == 0


def test_debt_plan_schedule_monotonic(db_session, user, debts):
    service = DebtOptimizerService(db_session)
    plan = service.generate_plan(str(user.id))
    schedule = plan.snowball.schedule
    for i in range(1, len(schedule)):
        if schedule[i]["month"] == 1 and schedule[i - 1]["balance"] == 0:
            continue
        assert schedule[i]["balance"] <= schedule[i - 1]["balance"] + 0.01


def test_debt_best_strategy_selected(db_session, user, debts):
    service = DebtOptimizerService(db_session)
    plan = service.generate_plan(str(user.id))
    assert plan.best_strategy in ("snowball", "avalanche")
