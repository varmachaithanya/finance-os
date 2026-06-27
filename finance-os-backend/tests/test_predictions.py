from app.services.prediction_service import PredictionService


def test_predictions_generated(db_session, user, expenses):
    service = PredictionService(db_session)
    predictions = service.generate_predictions(str(user.id))
    assert len(predictions) > 0
    for p in predictions:
        assert p.category_name
        assert p.current_average > 0
        assert p.predicted_amount > 0
        assert 0 <= p.confidence_score <= 100


def test_predictions_no_data(db_session, user):
    service = PredictionService(db_session)
    predictions = service.generate_predictions(str(user.id))
    assert len(predictions) == 0


def test_predictions_sorted_by_amount(db_session, user, expenses):
    service = PredictionService(db_session)
    predictions = service.generate_predictions(str(user.id))
    for i in range(1, len(predictions)):
        assert predictions[i - 1].predicted_amount >= predictions[i].predicted_amount


def test_predictions_contain_food(db_session, user, expenses, categories):
    service = PredictionService(db_session)
    predictions = service.generate_predictions(str(user.id))
    names = [p.category_name for p in predictions]
    assert "Food" in names
