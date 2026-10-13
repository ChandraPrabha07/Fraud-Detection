"""Factories for the dimensionality reduction techniques under comparison."""
from __future__ import annotations

from sklearn.decomposition import PCA, TruncatedSVD
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis


def max_lda_components(n_classes: int, n_features: int) -> int:
    """LDA projects onto at most min(n_classes - 1, n_features) axes."""
    return max(1, min(n_classes - 1, n_features))


def build_reducers(n_components: int, n_classes: int, n_features: int, random_state: int) -> dict:
    return {
        "PCA": PCA(n_components=n_components, random_state=random_state),
        "SVD": TruncatedSVD(n_components=n_components, random_state=random_state),
        # Binary fraud target -> exactly one discriminant component.
        "LDA": LinearDiscriminantAnalysis(n_components=max_lda_components(n_classes, n_features)),
    }
