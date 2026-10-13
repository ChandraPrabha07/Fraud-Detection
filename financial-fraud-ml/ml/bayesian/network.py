"""Bayesian belief network construction and fitting (pgmpy)."""
from __future__ import annotations

import pandas as pd
from pgmpy.estimators import BayesianEstimator

try:  # pgmpy >= 1.0
    from pgmpy.models import DiscreteBayesianNetwork as BayesNet
except ImportError:  # pragma: no cover - older pgmpy
    from pgmpy.models import BayesianNetwork as BayesNet

from ml.bayesian.data_generator import EVIDENCE_VARIABLES, TARGET_VARIABLE

# Each risk indicator directly influences the fraud node.
NETWORK_EDGES = [(variable, TARGET_VARIABLE) for variable in EVIDENCE_VARIABLES]


def build_and_fit_network(data: pd.DataFrame) -> BayesNet:
    model = BayesNet(NETWORK_EDGES)
    # BDeu prior smooths rare parent combinations (e.g. all four risk flags at once).
    cpds = BayesianEstimator(model, data).get_parameters(prior_type="BDeu", equivalent_sample_size=10)
    model.add_cpds(*cpds)
    model.check_model()
    return model
