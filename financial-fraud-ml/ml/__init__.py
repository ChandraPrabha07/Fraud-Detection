import warnings

# pgmpy warns about its own internal StructureScore import on every load; not actionable here.
warnings.filterwarnings("ignore", message=r".*pgmpy\.estimators\.StructureScore.*", category=FutureWarning)
